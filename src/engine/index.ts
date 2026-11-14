import type { CrewAlert, CrewId, DailyRecord, IndicatorId, RegionId, Severity } from '../config/types'
import { buildBaselines } from './baseline'
import type { Baselines } from './baseline'
import { selectEscalation } from './escalation'
import type { Escalation } from './escalation'
import { buildFlightSurgeonPacket } from './packet'
import type { FlightSurgeonPacket } from './packet'
import { assessIndicatorHistory, aggregateRegionStatuses } from './status'
import type { IndicatorAssessment } from './status'
import { detectSyndromes } from './syndromes'

export interface CrewAssessment {
  crewId: CrewId
  day: number
  baselines: Baselines
  indicators: IndicatorAssessment[]
  alerts: CrewAlert[]
  regionStatuses: Record<RegionId, Severity>
  radiationOverlayStatus: Severity
  escalation: Escalation
  packet: FlightSurgeonPacket
}

export function evaluateCrew(
  allRecords: DailyRecord[],
  crewId: CrewId,
  day: number,
  oneWayDelaySeconds = 0,
  actionsTaken: string[] = [],
  redRechecksConfirmed: IndicatorId[] = [],
): CrewAssessment {
  const history = allRecords
    .filter((record) => record.crewId === crewId && record.day <= day)
    .sort((left, right) => left.day - right.day)
  const currentDay = history.at(-1)?.day ?? day
  const baselines = buildBaselines(history)
  const indicators: IndicatorAssessment[] = []
  const ids: IndicatorId[] = ['resting_hr', 'bp', 'exercise_min', 'reaction', 'reaction_lapses', 'temp_c', 'fasting_glucose', 'body_mass_kg', 'sleep_h', 'mood', 'stress', 'dose']
  for (const id of ids) {
    const assessments = assessIndicatorHistory(history, id, baselines[id])
    if (assessments.length) indicators.push(assessments[assessments.length - 1])
  }
  const alerts = detectSyndromes(history, baselines)
  const regionStatuses = aggregateRegionStatuses(indicators, alerts, history.at(-1)?.symptoms ?? [])
  const radiationAssessment = indicators.find((assessment) => assessment.id === 'dose')
  const radiationOverlayStatus: Severity = alerts.some((alert) => alert.id === 'radiation_event') ? 'red' : radiationAssessment?.status ?? 'green'
  const severityRank: Record<Severity, number> = { green: 0, amber: 1, red: 2 }
  const worstStatus = Object.values(regionStatuses).reduce<Severity>((worst, current) => severityRank[current] > severityRank[worst] ? current : worst, radiationOverlayStatus)
  const singleRedNeedsRepeat = alerts.length === 0 && indicators.some((indicator) => indicator.needsRepeatMeasurement && !redRechecksConfirmed.includes(indicator.id))
  const escalation = selectEscalation(alerts, worstStatus, singleRedNeedsRepeat, oneWayDelaySeconds)
  const packet = buildFlightSurgeonPacket({ crewId, day: currentDay, records: history, baselines, assessments: indicators, alerts, actionsTaken })
  return { crewId, day: currentDay, baselines, indicators, alerts, regionStatuses, radiationOverlayStatus, escalation, packet }
}
