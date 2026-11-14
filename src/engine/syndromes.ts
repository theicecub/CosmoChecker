import type { CrewAlert, DailyRecord, IndicatorId } from '../config/types'
import { indicatorFloors, radiationEventThreshold } from '../config/thresholds'
import type { Baselines } from './baseline'
import { median, mean, robustZ } from './statistics'

function tail<T>(items: T[], count: number): T[] { return items.slice(Math.max(0, items.length - count)) }
function reasonDelta(label: string, value: number, baseline: number, unit: string, baselineDays: number, z?: number): string {
  const delta = value - baseline
  const sign = delta > 0 ? '+' : ''
  return `${label} ${sign}${delta.toFixed(1)} ${unit} vs your ${baselineDays}-day baseline${z === undefined ? '' : ` (z = ${z.toFixed(1)})`}`
}

function baselineValue(baselines: Baselines, indicator: IndicatorId): number | undefined { return baselines[indicator]?.median }

export function detectSyndromes(records: DailyRecord[], baselines: Baselines): CrewAlert[] {
  const sorted = [...records].sort((left, right) => left.day - right.day)
  const current = sorted.at(-1)
  if (!current) return []
  const alerts: CrewAlert[] = []
  const recent3 = tail(sorted, 3)
  const tempBase = baselineValue(baselines, 'temp_c')
  const hrBase = baselineValue(baselines, 'resting_hr')
  const sleepBase = baselineValue(baselines, 'sleep_h')
  if (tempBase !== undefined && hrBase !== undefined && sleepBase !== undefined) {
    const qualifying = recent3.filter((record) => record.temp_c >= tempBase + 0.5 && record.resting_hr >= hrBase + 10 && record.sleep_h <= sleepBase - 1)
    if (qualifying.length >= 2) {
      const rashOrThroat = qualifying.some((record) => record.symptoms.includes('rash') || record.symptoms.includes('sore_throat'))
      const avgTemp = mean(qualifying.map((record) => record.temp_c))
      const avgHr = mean(qualifying.map((record) => record.resting_hr))
      const avgSleep = mean(qualifying.map((record) => record.sleep_h))
      const tempZ = robustZ(avgTemp, tempBase, baselines.temp_c!.mad, indicatorFloors.temp_c)
      const hrZ = robustZ(avgHr, hrBase, baselines.resting_hr!.mad, indicatorFloors.resting_hr)
      alerts.push({
        id: 'infection_like', level: rashOrThroat ? 'L3' : 'L2', day: current.day,
        regions: ['immune', 'heart_vessels', 'mind_sleep'],
        reasons: [
          `${reasonDelta('Temperature', avgTemp, tempBase, '°C', baselines.temp_c!.validDays, tempZ)} on ${qualifying.length} of the last 3 days`,
          `${reasonDelta('Resting HR', avgHr, hrBase, 'bpm', baselines.resting_hr!.validDays, hrZ)} on ${qualifying.length} of the last 3 days`,
          `${reasonDelta('Sleep', avgSleep, sleepBase, 'h', baselines.sleep_h!.validDays)} on ${qualifying.length} of the last 3 days`,
          ...(rashOrThroat ? ['Rash or sore throat was reported.'] : []),
        ],
        actions: ['Repeat the measurements using the usual method.', 'Follow the mission health protocol and contact the flight surgeon as directed.'],
      })
    }
  }

  const recentSleep3 = tail(sorted, 3)
  const lapsesBase = baselineValue(baselines, 'reaction_lapses')
  const reactionLapsesNow = current.reaction_lapses
  const sleepDebtReasons: string[] = []
  if (recentSleep3.length === 3 && recentSleep3.every((record) => record.sleep_h < 6)) {
    sleepDebtReasons.push(`Sleep was under 6 h for ${recentSleep3.length} consecutive nights (latest ${current.sleep_h.toFixed(1)} h).`)
  }
  if (lapsesBase !== undefined && reactionLapsesNow >= Math.max(2, 2 * lapsesBase)) {
    sleepDebtReasons.push(`Reaction-test lapses: ${reactionLapsesNow} today vs ${lapsesBase.toFixed(1)} median baseline.`)
  }
  if (sleepDebtReasons.length) alerts.push({
    id: 'sleep_debt', level: 'L2', day: current.day, regions: ['mind_sleep', 'brain_eyes'],
    reasons: sleepDebtReasons, actions: ['Protect a steady sleep window.', 'Recheck sleep and reaction performance at the next planned check-in.'],
  })

  const recent7 = tail(sorted, 7)
  if (recent7.length === 7 && recent7.every((record) => record.exercise_min < 72)) alerts.push({
    id: 'deconditioning', level: 'L2', day: current.day, regions: ['bones_muscle'],
    reasons: [`Exercise was below 60% of the 120-minute plan on all 7 recent days (latest ${current.exercise_min} min).`],
    actions: ['Review the planned exercise slot and any barriers with the crew health protocol.'],
  })

  const moodBase = baselineValue(baselines, 'mood')
  const mood3 = mean(recent3.map((record) => record.mood))
  if (recent3.length === 3 && (mood3 <= 2.5 || (moodBase !== undefined && mood3 <= moodBase - 1))) alerts.push({
    id: 'mood_drift', level: 'L2', day: current.day, regions: ['mind_sleep'],
    reasons: [`Three-day mood mean ${mood3.toFixed(1)} (baseline ${moodBase?.toFixed(1) ?? 'not available'}).`],
    actions: ['Consider a steady routine and a crew or home connection that feels supportive.'],
  })

  const priorPeaks = tail(sorted.slice(0, -1).filter((record) => record.daily_peak_dose_msv !== undefined).map((record) => record.daily_peak_dose_msv as number), 7)
  const peak = current.daily_peak_dose_msv
  const priorMedian = median(priorPeaks)
  if (peak !== undefined && priorPeaks.length === 7 && priorMedian > 0 && peak > radiationEventThreshold.multiplier * priorMedian) alerts.push({
    id: 'radiation_event', level: 'L3', day: current.day, regions: [],
    reasons: [`Daily peak dose ${peak.toFixed(2)} mSv is more than ${radiationEventThreshold.multiplier}× the trailing 7-day median (${priorMedian.toFixed(2)} mSv).`],
    actions: ['Go to the designated shelter now, then follow the mission radiation protocol.'],
  })
  return alerts
}
