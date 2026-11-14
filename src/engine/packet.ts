import type { CrewAlert, DailyRecord, IndicatorId } from '../config/types'
import type { Baselines } from './baseline'
import type { IndicatorAssessment } from './status'

export interface FlightSurgeonPacket {
  version: 1
  crewId: string
  generatedForDay: number
  baseline: Partial<Record<IndicatorId, { median: number; mad: number; validDays: number }>>
  flaggedIndicators: Array<{ id: IndicatorId; value: number; status: string; robustZ?: number }>
  lastSevenDays: Array<Pick<DailyRecord, 'day'|'resting_hr'|'bp_sys'|'bp_dia'|'temp_c'|'sleep_h'|'mood'|'stress'|'exercise_min'|'reaction_median_ms'|'reaction_lapses'|'symptoms'|'body_mass_kg'|'fasting_glucose'|'daily_peak_dose_msv'>>
  alerts: CrewAlert[]
  actionsTaken: string[]
}

export function buildFlightSurgeonPacket(input: {
  crewId: string
  day: number
  records: DailyRecord[]
  baselines: Baselines
  assessments: IndicatorAssessment[]
  alerts: CrewAlert[]
  actionsTaken?: string[]
}): FlightSurgeonPacket {
  const recentRecords = input.records.filter((record) => record.day <= input.day && record.day > input.day - 7).sort((a, b) => a.day - b.day)
  const packet: FlightSurgeonPacket = {
    version: 1,
    crewId: input.crewId,
    generatedForDay: input.day,
    baseline: Object.fromEntries(Object.entries(input.baselines).map(([id, value]) => [id, value && {
      median: Number(value.median.toFixed(2)), mad: Number(value.mad.toFixed(2)), validDays: value.validDays,
    }])),
    flaggedIndicators: input.assessments.filter((assessment) => assessment.flagged || assessment.status !== 'green').map(({ id, value, status, robustZ }) => ({
      id, value: Number(value.toFixed(2)), status, ...(robustZ === undefined ? {} : { robustZ: Number(robustZ.toFixed(2)) }),
    })),
    lastSevenDays: recentRecords.map(({ day, resting_hr, bp_sys, bp_dia, temp_c, sleep_h, mood, stress, exercise_min, reaction_median_ms, reaction_lapses, symptoms, body_mass_kg, fasting_glucose, daily_peak_dose_msv }) => ({
      day, resting_hr, bp_sys, bp_dia, temp_c, sleep_h, mood, stress, exercise_min,
      reaction_median_ms, reaction_lapses, symptoms,
      ...(body_mass_kg === undefined ? {} : { body_mass_kg }),
      ...(fasting_glucose === undefined ? {} : { fasting_glucose }),
      ...(daily_peak_dose_msv === undefined ? {} : { daily_peak_dose_msv }),
    })),
    alerts: input.alerts.filter((alert) => alert.day <= input.day && alert.day > input.day - 7),
    actionsTaken: input.actionsTaken ?? [],
  }
  const serialized = JSON.stringify(packet)
  if (new TextEncoder().encode(serialized).byteLength > 5 * 1024) throw new Error('Flight Surgeon Packet exceeds the 5 KB limit')
  return packet
}

export function formatPacketText(packet: FlightSurgeonPacket): string {
  const lines = [
    `OrbitVitals Flight Surgeon Packet · Day ${packet.generatedForDay}`,
    `Crew member: ${packet.crewId}`,
    `Recent records: ${packet.lastSevenDays.length} day(s)`,
    '',
    'Baselines (median; MAD; valid days):',
    ...Object.entries(packet.baseline).map(([id, baseline]) => `- ${id}: ${baseline?.median}; ${baseline?.mad}; ${baseline?.validDays} days`),
    '',
    'Flagged indicators:',
    ...(packet.flaggedIndicators.length ? packet.flaggedIndicators.map((item) => `- ${item.id}: ${item.value} (${item.status}${item.robustZ === undefined ? '' : `, z ${item.robustZ}`})`) : ['- None']),
    '',
    'Alerts:',
    ...(packet.alerts.length ? packet.alerts.flatMap((alert) => [`- ${alert.id} (${alert.level}): ${alert.reasons.join(' ')}`, `  Actions: ${alert.actions.join(' ')}`]) : ['- None']),
    '',
    'Actions taken:',
    ...(packet.actionsTaken.length ? packet.actionsTaken.map((action) => `- ${action}`) : ['- None recorded']),
  ]
  return lines.join('\n')
}
