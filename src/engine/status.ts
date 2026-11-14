import type { DailyRecord, IndicatorId, RegionId, Severity } from '../config/types'
import { indicatorFloors, numericThresholds } from '../config/thresholds'
import { valueFor } from './baseline'
import type { Baseline } from './baseline'
import { cusum, ewma, mean, robustZ } from './statistics'

export interface IndicatorAssessment {
  id: IndicatorId
  value: number
  baseline?: Baseline
  robustZ?: number
  ewmaZ?: number
  cusumTripped: boolean
  flagged: boolean
  consecutiveFlags: number
  absoluteStatus: Severity
  status: Severity
  needsRepeatMeasurement: boolean
  region?: RegionId
}

export const REGION_INDICATORS: Record<RegionId, IndicatorId[]> = {
  heart_vessels: ['resting_hr', 'bp'],
  bones_muscle: ['exercise_min', 'symptoms'],
  brain_eyes: ['reaction', 'reaction_lapses', 'symptoms'],
  inner_ear: ['symptoms'],
  immune: ['temp_c', 'symptoms'],
  gut_nutrition: ['fasting_glucose', 'body_mass_kg', 'symptoms'],
  mind_sleep: ['sleep_h', 'mood', 'stress'], 
}

export function classifyAbsolute(record: DailyRecord, indicator: IndicatorId, value: number, baseline?: Baseline, history: DailyRecord[] = [record]): Severity {
  if (indicator === 'resting_hr') {
    const band = numericThresholds.resting_hr
    if (value < band.redBelow || value >= band.redAtOrAbove) return 'red'
    if (value < band.amberBelow || value >= band.amberAtOrAbove) return 'amber'
  }
  if (indicator === 'bp') {
    const band = numericThresholds.bp
    if (record.bp_sys < band.redSystolicBelow || record.bp_sys >= band.redSystolicAtOrAbove || record.bp_dia < band.redDiastolicBelow || record.bp_dia >= band.redDiastolicAtOrAbove) return 'red'
    if (record.bp_sys < band.amberSystolicBelow || record.bp_sys >= band.amberSystolicAtOrAbove || record.bp_dia < band.amberDiastolicBelow || record.bp_dia >= band.amberDiastolicAtOrAbove) return 'amber'
  }
  if (indicator === 'temp_c') {
    const band = numericThresholds.temp_c
    if (value < band.redBelow || value >= band.redAtOrAbove) return 'red'
    if (value < band.amberBelow || value >= band.amberAtOrAbove) return 'amber'
  }
  if (indicator === 'fasting_glucose') {
    const band = numericThresholds.fasting_glucose
    if (value < band.redBelow || value >= band.redAtOrAbove) return 'red'
    if (value < band.amberBelow || value >= band.amberAtOrAbove) return 'amber'
  }
  if (indicator === 'sleep_h') {
    const band = numericThresholds.sleep_h
    const recent = history.filter((item) => item.day <= record.day).slice(-3).map((item) => item.sleep_h)
    if (recent.length === 3) {
      const average = mean(recent)
      if (average < band.redBelow) return 'red'
      if (average < band.amberBelow) return 'amber'
    }
  }
  if (indicator === 'mood') {
    const band = numericThresholds.mood
    const recent = history.filter((item) => item.day <= record.day).slice(-3).map((item) => item.mood)
    if (recent.length === 3) {
      const average = mean(recent)
      if (average < band.redBelow) return 'red'
      if (average < band.amberBelow) return 'amber'
    }
  }
  if (indicator === 'body_mass_kg' && baseline && baseline.median > 0) {
    const lossPercent = ((baseline.median - value) / baseline.median) * 100
    const band = numericThresholds.body_mass_kg
    if (lossPercent >= band.redLossPct) return 'red'
    if (lossPercent >= band.amberLossPct) return 'amber'
  }
  return 'green'
}

function regionFor(indicator: IndicatorId): RegionId | undefined {
  return (Object.keys(REGION_INDICATORS) as RegionId[]).find((region) => REGION_INDICATORS[region].includes(indicator))
}

export function assessIndicatorHistory(
  history: DailyRecord[],
  indicator: IndicatorId,
  baseline?: Baseline,
): IndicatorAssessment[] {
  const usable = [...history].sort((left, right) => left.day - right.day).filter((record) => Number.isFinite(valueFor(record, indicator)))
  const values = usable.map((record) => valueFor(record, indicator) as number)
  const firstBaselineDay = baseline ? usable[baseline.validDays - 1]?.day ?? 0 : 0
  const zScores = values.map((value, index) => usable[index].day > firstBaselineDay && baseline
    ? robustZ(value, baseline.median, baseline.mad, indicatorFloors[indicator]) : 0)
  const smoothed = ewma(zScores)
  const cumulative = cusum(zScores)
  let flaggedRun = 0
  return usable.map((record, index) => {
    const value = values[index]
    const isFlagged = Boolean(baseline && record.day > firstBaselineDay && (Math.abs(smoothed[index]) >= 1.25 || cumulative[index].tripped))
    flaggedRun = isFlagged ? flaggedRun + 1 : 0
    const absoluteStatus = classifyAbsolute(record, indicator, value, baseline, usable)
    const status: Severity = absoluteStatus === 'red' || flaggedRun >= 4 ? 'red' : absoluteStatus === 'amber' || flaggedRun >= 2 ? 'amber' : 'green'
    return {
      id: indicator, value, baseline, robustZ: baseline ? zScores[index] : undefined,
      ewmaZ: baseline ? smoothed[index] : undefined, cusumTripped: cumulative[index].tripped,
      flagged: isFlagged, consecutiveFlags: flaggedRun, absoluteStatus, status,
      needsRepeatMeasurement: absoluteStatus === 'red' && record.symptoms.length === 0,
      region: regionFor(indicator),
    }
  })
}

function symptomsForRegion(region: RegionId, symptoms: string[]): boolean {
  const mapping: Partial<Record<RegionId, string[]>> = {
    bones_muscle: ['muscle_bone_pain'], brain_eyes: ['headache', 'blurred_vision'],
    inner_ear: ['dizziness', 'nausea'], immune: ['rash', 'sore_throat', 'fatigue'],
    gut_nutrition: ['appetite_loss', 'nausea'],
  }
  return (mapping[region] ?? []).some((symptom) => symptoms.includes(symptom))
}

export function aggregateRegionStatuses(assessments: IndicatorAssessment[], activeAlerts: import('../config/types').CrewAlert[] = [], symptoms: string[] = []): Record<RegionId, Severity> {
  const severityRank: Record<Severity, number> = { green: 0, amber: 1, red: 2 }
  const result = {} as Record<RegionId, Severity>
  for (const region of Object.keys(REGION_INDICATORS) as RegionId[]) {
    const statuses = assessments.filter((assessment) => assessment.region === region).map((assessment) => assessment.status)
    const alertStatuses = activeAlerts.filter((alert) => alert.regions.includes(region)).map((alert) => alert.level === 'L2' ? 'amber' as const : 'red' as const)
    const symptomStatuses = symptomsForRegion(region, symptoms) ? ['amber' as const] : []
    result[region] = [...statuses, ...alertStatuses, ...symptomStatuses].reduce<Severity>((worst, current) => severityRank[current] > severityRank[worst] ? current : worst, 'green')
  }
  return result
}
