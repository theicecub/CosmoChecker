import type { CrewId, DailyRecord, ScenarioId } from '../config/types'

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function generateMission(seed: number, scenario: ScenarioId = 'baseline_ok'): DailyRecord[] {
  const random = mulberry32(seed)
  const crew = ['crew_1', 'crew_2', 'crew_3', 'crew_4'] as CrewId[]
  const records: DailyRecord[] = []
  for (const crewId of crew) {
    const offset = random() * 0.8 - 0.4
    for (let day = 1; day <= 180; day++) {
      const affected = scenario === 'infection' && day >= 60 && day <= 66
      const sleepLoss = scenario === 'sleep_loss' && day >= 90 && day <= 97
      const deconditioned = scenario === 'deconditioning' && day >= 130 && day <= 150
      const spe = scenario === 'spe' && day === 120
      const noise = (range: number) => (random() - 0.5) * range
      records.push({
        crewId, day,
        resting_hr: Math.round(65 + offset * 5 + (affected ? 12 : 0) + noise(8)),
        bp_sys: Math.round(116 + noise(12)), bp_dia: Math.round(72 + noise(8)),
        temp_c: Number((36.7 + (affected ? 0.8 : 0) + noise(0.3)).toFixed(1)),
        sleep_h: Number((7.4 + (affected ? -1.5 : 0) + (sleepLoss ? -2.4 : 0) + noise(0.8)).toFixed(1)),
        sleep_quality: Math.max(1, Math.min(5, Math.round(4 + noise(1.4)))),
        mood: Math.max(1, Math.min(5, Number((3.8 + (sleepLoss ? -1 : 0) + noise(0.7)).toFixed(1)))),
        stress: Math.max(1, Math.min(5, Number((2.2 + noise(1)).toFixed(1)))),
        exercise_min: Math.round((deconditioned ? 36 : 120) + noise(30)),
        reaction_median_ms: Math.round(280 + noise(70)), reaction_lapses: sleepLoss ? (random() < 0.28 ? 2 : 0) : (random() < 0.07 ? 1 : 0),
        symptoms: affected && random() < 0.2 ? ['fatigue'] : [],
        body_mass_kg: Number((74 + offset + noise(0.8)).toFixed(1)),
        fasting_glucose: Math.round(88 + noise(12)),
        daily_peak_dose_msv: Number((spe ? 2 + random() * 3 : 0.1 + random() * 0.2).toFixed(2)),
      })
    }
  }
  return records
}
