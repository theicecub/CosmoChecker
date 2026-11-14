export interface PulseEstimate {
  bpm?: number
  confidence: number
}

export function estimatePulse(samples: number[], sampleRateHz: number): PulseEstimate {
  if (samples.length < Math.round(sampleRateHz * 8) || !Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    return { confidence: 0 }
  }

  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length
  const window = samples.map((_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (samples.length - 1)))
  const signal = samples.map((value, index) => (value - average) * window[index])
  const windowPower = window.reduce((sum, value) => sum + value * value, 0)
  const rms = Math.sqrt(signal.reduce((sum, value) => sum + value * value, 0) / windowPower)
  if (rms < 1e-6) return { confidence: 0 }

  let bestFrequency = 0
  let bestProminence = 0
  const windowSum = window.reduce((sum, value) => sum + value, 0)
  for (let bpm = 45; bpm <= 130; bpm += 1) {
    const frequency = bpm / 60
    let real = 0
    let imaginary = 0
    for (let index = 0; index < signal.length; index += 1) {
      const angle = (2 * Math.PI * frequency * index) / sampleRateHz
      real += signal[index] * Math.cos(angle)
      imaginary += signal[index] * Math.sin(angle)
    }
    const amplitude = (2 * Math.hypot(real, imaginary)) / windowSum
    const prominence = amplitude / rms
    if (prominence > bestProminence) {
      bestProminence = prominence
      bestFrequency = frequency
    }
  }

  const confidence = Math.max(0, Math.min(100, Math.round(((bestProminence - 0.35) / 0.75) * 100)))
  return confidence >= 50
    ? { bpm: Math.round(bestFrequency * 60), confidence }
    : { confidence }
}
