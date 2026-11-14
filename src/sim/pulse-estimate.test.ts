import { describe, expect, it } from 'vitest'
import { estimatePulse } from './pulse-estimate'

describe('estimatePulse', () => {
  it('estimates a clear periodic signal and reports confidence', () => {
    const rate = 10
    const bpm = 72
    const samples = Array.from({ length: 120 }, (_, index) => 120 + 4 * Math.sin((2 * Math.PI * (bpm / 60) * index) / rate))
    const result = estimatePulse(samples, rate)

    expect(result.bpm).toBe(72)
    expect(result.confidence).toBeGreaterThanOrEqual(50)
  })

  it('does not report a pulse for a flat or too-short signal', () => {
    expect(estimatePulse(Array(120).fill(90), 10)).toEqual({ confidence: 0 })
    expect(estimatePulse(Array(40).fill(90), 10)).toEqual({ confidence: 0 })
  })
})
