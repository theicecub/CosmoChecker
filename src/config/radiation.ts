import type { DestinationId } from './types'

export const RADIATION_PLACEHOLDER_RATES: Record<DestinationId, number> = {
  iss: 0.16,
  moon_base: 0.22,
  mars_transit: 0.34,
  mars_surface: 0.25,
}
