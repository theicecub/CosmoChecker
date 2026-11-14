import { describe, expect, it } from 'vitest'
import { generateMission, mulberry32 } from './generator'

describe('mulberry32', () => {
  it('repeats the same sequence for a seed', () => {
    const first = mulberry32(42)
    const second = mulberry32(42)
    expect(Array.from({ length: 10 }, first)).toEqual(Array.from({ length: 10 }, second))
  })
  it('produces values in [0, 1)', () => {
    const random = mulberry32(7)
    for (let i = 0; i < 100; i++) expect(random()).toBeGreaterThanOrEqual(0), expect(random()).toBeLessThan(1)
  })
})

describe('generateMission', () => {
  it('creates reproducible daily records for four crew over 180 days', () => {
    const first = generateMission(42)
    expect(first).toHaveLength(720)
    expect(first).toEqual(generateMission(42))
    expect(first[0]).toMatchObject({ crewId: 'crew_1', day: 1 })
    expect(first[179]).toMatchObject({ day: 180 })
  })
  it('applies the declared infection scenario window', () => {
    const records = generateMission(42, 'infection').filter((record) => record.crewId === 'crew_1')
    expect(records[58].temp_c).toBeLessThan(37.0)
    expect(records[61].temp_c).toBeGreaterThan(37.0)
    expect(records[61].resting_hr).toBeGreaterThan(70)
  })
  it('simulates a single solar particle event on mission day 120', () => {
    const records = generateMission(42, 'spe').filter((record) => record.crewId === 'crew_1')
    expect(records[118].daily_peak_dose_msv).toBeLessThan(1)
    expect(records[119].daily_peak_dose_msv).toBeGreaterThan(2)
    expect(records[120].daily_peak_dose_msv).toBeLessThan(1)
  })
})
