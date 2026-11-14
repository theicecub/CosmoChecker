import type { CrewId, DestinationId, HazardId, RegionId } from './types'

export const CREW_MEMBERS: { id: CrewId; label: string }[] = [
  { id: 'crew_1', label: 'Aster' }, { id: 'crew_2', label: 'Comet' },
  { id: 'crew_3', label: 'Nova' }, { id: 'crew_4', label: 'Sol' },
]

export const SYMPTOM_OPTIONS = [
  { id: 'headache', label: 'Headache' }, { id: 'blurred_vision', label: 'Blurred vision' },
  { id: 'dizziness', label: 'Dizziness' }, { id: 'nausea', label: 'Nausea' }, { id: 'rash', label: 'Rash' },
  { id: 'sore_throat', label: 'Sore throat' }, { id: 'fatigue', label: 'Fatigue' }, { id: 'appetite_loss', label: 'Appetite change' },
  { id: 'muscle_bone_pain', label: 'Muscle or bone pain' },
] as const

export const HAZARDS: { id: HazardId; label: string; shortLabel: string }[] = [
  { id: 'radiation', label: 'Space radiation', shortLabel: 'Radiation' },
  { id: 'isolation', label: 'Isolation and confinement', shortLabel: 'Isolation' },
  { id: 'distance', label: 'Distance from Earth', shortLabel: 'Distance' },
  { id: 'gravity', label: 'Gravity fields', shortLabel: 'Gravity' },
  { id: 'closed_environment', label: 'Hostile and closed environments', shortLabel: 'Environment' },
]

export const HAZARD_INTENSITY: Record<HazardId, Partial<Record<RegionId | 'radiation', 0 | 1 | 2 | 3>>> = {
  gravity: { heart_vessels: 3, bones_muscle: 3, inner_ear: 3, brain_eyes: 2 },
  isolation: { mind_sleep: 3 },
  distance: {},
  closed_environment: { immune: 2, gut_nutrition: 2, mind_sleep: 1 },
  radiation: { radiation: 3 },
}

export const DESTINATIONS: Record<DestinationId, {
  label: string
  gravityG: number
  delaySeconds: number
  resupply: string
}> = {
  iss: { label: 'ISS', gravityG: 0, delaySeconds: 1, resupply: 'Regular cargo flights support planned resupply.' },
  moon_base: { label: 'Moon base', gravityG: 0.17, delaySeconds: 1.3, resupply: 'Resupply depends on launch windows and mission plans.' },
  mars_transit: { label: 'Mars transit', gravityG: 0, delaySeconds: 180, resupply: 'No rapid resupply from Earth; use onboard supplies and mission procedures.' },
  mars_surface: { label: 'Mars surface', gravityG: 0.38, delaySeconds: 180, resupply: 'Resupply is limited by distance, launch windows, and mission plans.' },
}

export const REGIONS: Record<RegionId, {
  label: string
  shortLabel: string
  why: string
  how: string[]
  now: string[]
  call: string
  sourceLabel: string
  sourceUrl: string
}> = {
  heart_vessels: {
    label: 'Heart & circulation', shortLabel: 'Heart',
    why: 'Weightlessness changes how blood moves through the body. Tracking pulse and blood pressure can help you notice a change from your usual pattern.',
    how: ['Sit quietly for five minutes.', 'Count your pulse for a full minute, or use the approved monitor.', 'Use the cuff on a bare arm at heart level.', 'Keep your feet flat and record both numbers.'],
    now: ['Rest and repeat an unusual reading as your mission procedure directs.', 'Log the result with the time and how you felt.'],
    call: 'Follow your mission thresholds. Contact the flight surgeon for a repeated out-of-range reading, new symptoms, or an alert that tells you to call.',
    sourceLabel: 'NASA HRP risk overview', sourceUrl: 'https://www.nasa.gov/hrp/risks/',
  },
  bones_muscle: {
    label: 'Bones & muscles', shortLabel: 'Bones',
    why: 'Without the usual pull of gravity, bones can lose density and muscles can weaken. Exercise is a key countermeasure on space missions.',
    how: ['Log completed exercise minutes after each session.', 'Use the mission plan as your activity target.', 'Record muscle or bone pain from the symptom list.', 'Note if equipment or symptoms changed the session.'],
    now: ['Choose a planned exercise slot that fits the mission schedule.', 'Tell the crew health lead if pain or equipment problems get in the way.'],
    call: 'Call the flight surgeon for new or worsening pain, an injury, or a mission alert that asks you to call.',
    sourceLabel: 'NASA HRP risk overview', sourceUrl: 'https://www.nasa.gov/hrp/risks/',
  },
  brain_eyes: {
    label: 'Brain & eyes', shortLabel: 'Brain',
    why: 'Spaceflight can change eye and brain structure. A short reaction task and symptom check can help track changes over time.',
    how: ['Use the same device and setup for each reaction test.', 'Tap as soon as the signal appears.', 'Keep still and focus on the screen.', 'Record vision changes or headache in the symptom list.'],
    now: ['Take a short rest before repeating a test if you were interrupted.', 'Write down a new vision change or headache.'],
    call: 'Follow the mission call criteria for new or worsening vision changes, severe symptoms, or repeated unusual results.',
    sourceLabel: 'NASA HRP risk overview', sourceUrl: 'https://www.nasa.gov/hrp/risks/',
  },
  inner_ear: {
    label: 'Balance & inner ear', shortLabel: 'Balance',
    why: 'Gravity changes can affect balance and motion sensing. Dizziness, nausea, and coordination symptoms are useful to track.',
    how: ['Pause and sit or hold a stable surface if you feel unsteady.', 'Choose each symptom that applies.', 'Record when it began and whether it is getting better.', 'Use the same symptom list at each check-in.'],
    now: ['Move carefully and use your mission safety procedures.', 'Log the symptom and tell a crewmate if you need help.'],
    call: 'Contact the flight surgeon for symptoms that are severe, worsening, or meet your mission call criteria.',
    sourceLabel: 'NASA HRP risk overview', sourceUrl: 'https://www.nasa.gov/hrp/risks/',
  },
  immune: {
    label: 'Immune health', shortLabel: 'Immune',
    why: 'Spaceflight stress may affect immune responses. Some dormant viruses can become active again, so new rashes and other symptoms matter.',
    how: ['Use the approved thermometer as directed.', 'Wait for the reading to settle before recording it.', 'Check the symptom list for rash or sore throat.', 'Record when symptoms started.'],
    now: ['Rest and repeat an unusual temperature as your procedure directs.', 'Keep the area clean and follow onboard infection-control steps.'],
    call: 'Contact the flight surgeon for a repeated out-of-range temperature, rash, sore throat, or a mission alert that says to call.',
    sourceLabel: 'NASA HRP risk overview', sourceUrl: 'https://www.nasa.gov/hrp/risks/',
  },
  gut_nutrition: {
    label: 'Gut & nutrition', shortLabel: 'Nutrition',
    why: 'Food and nutrition support health during a mission. Spaceflight can also change the communities of microbes on skin and in the gut.',
    how: ['Record body mass on the same scale when scheduled.', 'Measure glucose only if it is part of your mission plan.', 'Note appetite changes in the symptom list.', 'Use the approved device instructions.'],
    now: ['Review food and fluid intake with the crew plan.', 'Record changes so your team can see the pattern.'],
    call: 'Contact the flight surgeon for persistent appetite changes, repeated unusual measurements, or an alert that asks you to call.',
    sourceLabel: 'NASA HRP risk overview', sourceUrl: 'https://www.nasa.gov/hrp/risks/',
  },
  mind_sleep: {
    label: 'Mind & sleep', shortLabel: 'Mind',
    why: 'Isolation, busy schedules, and team stress can affect sleep and mood. A steady record helps you notice your own patterns.',
    how: ['Record sleep hours after waking.', 'Rate sleep quality, mood, and stress honestly.', 'Use the same scale each day.', 'Add a private note only if you choose.'],
    now: ['Protect a steady sleep window when mission tasks allow.', 'Try a planned light, movement, or crew connection break.'],
    call: 'You can ask for support at any time. Contact the flight surgeon for a worsening pattern or if you feel unsafe.',
    sourceLabel: 'NASA HRP risk overview', sourceUrl: 'https://www.nasa.gov/hrp/risks/',
  },
}

export const SOURCES = [
  { label: 'NASA Human Research Program hazards', url: 'https://www.nasa.gov/hrp/hazards/' },
  { label: 'NASA Human Research Program risks', url: 'https://www.nasa.gov/hrp/risks/' },
  { label: 'NASA ongoing HRP research', url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/' },
  { label: 'Canadian Space Agency: radiation monitoring', url: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp' },
  { label: 'Canadian Space Agency: why conduct science in space', url: 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp' },
]
