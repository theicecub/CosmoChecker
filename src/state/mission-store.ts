import { create } from 'zustand'
import type { CrewId, DestinationId, HazardId, ScenarioId } from '../config/types'
import { DESTINATIONS } from '../config/mission'

export type DataMode = 'demo' | 'live'
interface MissionState {
  missionDay: number
  isPlaying: boolean
  crewId: CrewId
  destination: DestinationId
  oneWayDelaySeconds: number
  mode: DataMode
  scenario: ScenarioId
  activeHazards: HazardId[]
  setMissionDay: (day: number) => void
  togglePlay: () => void
  advanceDay: () => void
  setCrewId: (crewId: CrewId) => void
  setDestination: (destination: DestinationId) => void
  setDelay: (seconds: number) => void
  setMode: (mode: DataMode) => void
  setScenario: (scenario: ScenarioId) => void
  toggleHazard: (hazard: HazardId) => void
}

export const useMissionStore = create<MissionState>((set) => ({
  missionDay: 30,
  isPlaying: false,
  crewId: 'crew_1',
  destination: 'iss',
  oneWayDelaySeconds: DESTINATIONS.iss.delaySeconds,
  mode: 'demo',
  scenario: 'baseline_ok',
  activeHazards: [],
  setMissionDay: (missionDay) => set({ missionDay: Math.max(1, Math.min(180, Math.round(missionDay))) }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  advanceDay: () => set((state) => ({ missionDay: state.missionDay >= 180 ? 1 : state.missionDay + 1 })),
  setCrewId: (crewId) => set({ crewId }),
  setDestination: (destination) => set({ destination, oneWayDelaySeconds: DESTINATIONS[destination].delaySeconds }),
  setDelay: (oneWayDelaySeconds) => set({ oneWayDelaySeconds: oneWayDelaySeconds }),
  setMode: (mode) => set({ mode, isPlaying: false, missionDay: mode === 'live' ? 1 : 30 }),
  setScenario: (scenario) => set({
    scenario,
    mode: 'demo',
    missionDay: { baseline_ok: 30, infection: 62, sleep_loss: 92, deconditioning: 136, spe: 120 }[scenario],
    isPlaying: false,
  }),
  toggleHazard: (hazard) => set((state) => ({
    activeHazards: state.activeHazards.includes(hazard)
      ? state.activeHazards.filter((active) => active !== hazard)
      : [...state.activeHazards, hazard],
  })),
}))
