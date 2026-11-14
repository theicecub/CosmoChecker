import { describe, expect, it } from 'vitest'
import type { CrewAlert, DailyRecord } from '../config/types'
import { generateMission } from '../sim/generator'
import { evaluateCrew } from './index'
import { selectEscalation } from './escalation'
import { cusum, ewma, median, medianAbsoluteDeviation, robustZ } from './statistics'

describe('robust statistics', () => {
  it('calculates median, MAD, robust z, EWMA and two-sided CUSUM', () => {
    expect(median([1, 2, 9])).toBe(2)
    expect(medianAbsoluteDeviation([1, 2, 9])).toBe(1)
    expect(robustZ(3, 2, 1, 0.5)).toBeCloseTo(0.6745)
    expect(ewma([1, 1])).toEqual([0.3, 0.51])
    expect(cusum([3, 3])[1].tripped).toBe(true)
    expect(cusum([-3, -3])[1].tripped).toBe(true)
  })
})

describe('crew medic engine', () => {
  it('detects the seed-42 infection scenario by day 62 and marks immune amber', () => {
    const records = generateMission(42, 'infection')
    const result = evaluateCrew(records, 'crew_1', 62)
    const alert = result.alerts.find((item) => item.id === 'infection_like')
    expect(alert).toBeDefined()
    expect(alert?.day).toBe(62)
    expect(alert?.reasons.join(' ')).toMatch(/Temperature \+0\.\d °C vs your 14-day baseline/)
    expect(alert?.reasons.join(' ')).toMatch(/Resting HR \+\d+\.\d bpm vs your 14-day baseline \(z = /)
    expect(alert?.reasons.join(' ')).toMatch(/Sleep -\d+\.\d h vs your 14-day baseline/)
    expect(result.regionStatuses.immune).toBe('amber')
    expect(result.packet.alerts.some((item) => item.id === 'infection_like')).toBe(true)
    expect(new TextEncoder().encode(JSON.stringify(result.packet)).byteLength).toBeLessThanOrEqual(5 * 1024)
  })

  it('keeps private notes out of flight surgeon packets', () => {
    const base = generateMission(42, 'baseline_ok')[0]
    const record = { ...base, privateNote: 'this note must remain on device' } as DailyRecord & { privateNote: string }
    const result = evaluateCrew([record], record.crewId, record.day)
    expect(JSON.stringify(result.packet)).not.toContain(record.privateNote)
  })

  it('detects sleep debt in the sleep-loss scenario', () => {
    const result = evaluateCrew(generateMission(42, 'sleep_loss'), 'crew_1', 92)
    expect(result.alerts.some((item) => item.id === 'sleep_debt')).toBe(true)
  })

  it('detects a sustained exercise shortfall and a radiation spike', () => {
    const deconditioning = evaluateCrew(generateMission(42, 'deconditioning'), 'crew_1', 136)
    expect(deconditioning.alerts.some((item) => item.id === 'deconditioning')).toBe(true)
    const radiation = evaluateCrew(generateMission(42, 'spe'), 'crew_1', 120)
    const radiationAlert = radiation.alerts.find((item) => item.id === 'radiation_event')
    expect(radiationAlert).toBeDefined()
    expect(radiationAlert?.actions.join(' ')).toMatch(/Go to the designated shelter now/)
    expect(radiation.packet.alerts.some((item) => item.id === 'radiation_event')).toBe(true)
    expect(radiation.radiationOverlayStatus).toBe('red')
  })

  it('keeps baseline_ok at or below L1', () => {
    const records = generateMission(42, 'baseline_ok')
    for (let day = 1; day <= 180; day++) {
      const result = evaluateCrew(records, 'crew_1', day)
      expect(['L0', 'L1'], `day ${day}: ${JSON.stringify(result.alerts)}`).toContain(result.escalation.level)
      expect(result.alerts).toHaveLength(0)
    }
  })

  it('increases L3/L4 wording when the one-way delay exceeds one minute', () => {
    const alert: CrewAlert = { id: 'infection_like', level: 'L3', day: 1, regions: ['immune'], reasons: ['test'], actions: ['test'] }
    expect(selectEscalation([alert], 'amber', false, 180).instruction).toBe('Start now, send in parallel; do not wait for a reply.')
    const urgent: CrewAlert = { ...alert, id: 'radiation_event', level: 'L4' }
    expect(selectEscalation([urgent], 'red', false, 180).instruction).toBe('Start now, send in parallel; do not wait for a reply.')
  })

  it('holds a single symptom-free red absolute reading for a 5-minute recheck', () => {
    const record: DailyRecord = {
      crewId: 'crew_1', day: 1, resting_hr: 122, bp_sys: 118, bp_dia: 72, temp_c: 36.7,
      sleep_h: 7.5, sleep_quality: 4, mood: 4, stress: 2, exercise_min: 100,
      reaction_median_ms: 280, reaction_lapses: 0, symptoms: [],
    }
    const result = evaluateCrew([record], 'crew_1', 1)
    expect(result.escalation.level).toBe('L1')
    expect(result.escalation.instruction).toContain('Re-measure after 5 minutes at rest')
    const confirmed = evaluateCrew([record], 'crew_1', 1, 0, [], ['resting_hr'])
    expect(confirmed.escalation.level).toBe('L3')
    expect(confirmed.escalation.repeatFirst).toBe(false)
  })
})
