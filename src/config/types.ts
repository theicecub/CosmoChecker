export const REGIONS = ['heart_vessels','bones_muscle','brain_eyes','inner_ear','immune','gut_nutrition','mind_sleep'] as const
export type RegionId = typeof REGIONS[number]
export type IndicatorId = 'resting_hr'|'bp'|'exercise_min'|'reaction'|'reaction_lapses'|'symptoms'|'temp_c'|'fasting_glucose'|'body_mass_kg'|'sleep_h'|'mood'|'stress'|'dose'
export type AlertLevel = 'L2'|'L3'|'L4'
export interface CrewAlert {
  id: 'infection_like'|'sleep_debt'|'deconditioning'|'mood_drift'|'radiation_event'
  level: AlertLevel
  day: number
  regions: RegionId[]
  reasons: string[]
  actions: string[]
}
export type ScenarioId = 'baseline_ok'|'infection'|'sleep_loss'|'deconditioning'|'spe'
export type CrewId = 'crew_1'|'crew_2'|'crew_3'|'crew_4'
export type DestinationId = 'iss'|'moon_base'|'mars_transit'|'mars_surface'
export type HazardId = 'radiation'|'isolation'|'distance'|'gravity'|'closed_environment'
export type Severity = 'green'|'amber'|'red'

export interface DailyRecord {
  crewId: CrewId
  day: number
  resting_hr: number
  bp_sys: number
  bp_dia: number
  temp_c: number
  sleep_h: number
  sleep_quality: number
  mood: number
  stress: number
  exercise_min: number
  reaction_median_ms: number
  reaction_lapses: number
  symptoms: string[]
  body_mass_kg?: number
  fasting_glucose?: number
  daily_peak_dose_msv?: number
  sleep_window_kept?: boolean
  hydration_plan_followed?: boolean
}
