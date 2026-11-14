export function median(values: number[]): number {
  if (!values.length) return Number.NaN
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function medianAbsoluteDeviation(values: number[], center = median(values)): number {
  return median(values.map((value) => Math.abs(value - center)))
}

export function robustZ(value: number, center: number, mad: number, floor: number): number {
  return 0.6745 * (value - center) / Math.max(mad, floor)
}

export function ewma(values: number[], lambda = 0.3): number[] {
  let previous = 0
  return values.map((value) => {
    previous = lambda * value + (1 - lambda) * previous
    return previous
  })
}

export interface CusumPoint { positive: number; negative: number; tripped: boolean }
export function cusum(values: number[], allowance = 0.5, threshold = 4): CusumPoint[] {
  let positive = 0
  let negative = 0
  return values.map((value) => {
    positive = Math.max(0, positive + value - allowance)
    negative = Math.min(0, negative + value + allowance)
    const tripped = positive >= threshold || negative <= -threshold
    const point = { positive, negative, tripped }
    if (tripped) { positive = 0; negative = 0 }
    return point
  })
}

export function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NaN
}
