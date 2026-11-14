import type { DailyRecord, IndicatorId } from '../config/types'
import { median, medianAbsoluteDeviation } from './statistics'

export const TRACKED_INDICATORS: IndicatorId[] = [
  'resting_hr', 'bp', 'exercise_min', 'reaction', 'reaction_lapses', 'temp_c',
  'fasting_glucose', 'body_mass_kg', 'sleep_h', 'mood', 'stress', 'dose',
]

export interface Baseline { median: number; mad: number; validDays: number }
export type Baselines = Partial<Record<IndicatorId, Baseline>>

export function valueFor(record: DailyRecord, indicator: IndicatorId): number | undefined {
  switch (indicator) {
    case 'resting_hr': return record.resting_hr
    case 'bp': return record.bp_sys
    case 'exercise_min': return record.exercise_min
    case 'reaction': return record.reaction_median_ms
    case 'reaction_lapses': return record.reaction_lapses
    case 'temp_c': return record.temp_c
    case 'fasting_glucose': return record.fasting_glucose
    case 'body_mass_kg': return record.body_mass_kg
    case 'sleep_h': return record.sleep_h
    case 'mood': return record.mood
    case 'stress': return record.stress
    case 'dose': return record.daily_peak_dose_msv
    case 'symptoms': return undefined
  }
}

export function buildBaselines(records: DailyRecord[], maxDays = 14, minDays = 7): Baselines {
  const sorted = [...records].sort((left, right) => left.day - right.day)
  const result: Baselines = {}
  for (const indicator of TRACKED_INDICATORS) {
    const values: number[] = []
    for (const record of sorted) {
      const value = valueFor(record, indicator)
      if (Number.isFinite(value)) values.push(value as number)
      if (values.length === maxDays) break
    }
    if (values.length >= minDays) {
      const center = median(values)
      result[indicator] = { median: center, mad: medianAbsoluteDeviation(values, center), validDays: values.length }
    }
  }
  return result
}
