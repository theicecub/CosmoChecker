export interface ThresholdBand { green: string; amber: string; red: string; source: string; needsClinicalReview: true }
export interface NumericBand { source: string; needsClinicalReview: true }

const reviewed = { source: 'User-provided starter thresholds; no validated clinical source assigned', needsClinicalReview: true } as const

export const thresholds = {
  resting_hr: { green: '50–99 bpm', amber: '40–49 or 100–119 bpm', red: '<40 or ≥120 bpm', ...reviewed },
  bp: { green: 'systolic 90–129 and diastolic 60–79 mmHg', amber: 'systolic 85–89 or 130–139; diastolic 55–59 or 80–89 mmHg', red: 'systolic <85 or ≥140; diastolic <55 or ≥90 mmHg', ...reviewed },
  temp_c: { green: '36.0 to <37.5 °C', amber: '35.0 to <36.0 or 37.5 to <38.0 °C', red: '<35.0 or ≥38.0 °C', ...reviewed },
  fasting_glucose: { green: '70–99 mg/dL', amber: '54–69 or 100–125 mg/dL', red: '<54 or ≥126 mg/dL', ...reviewed },
  sleep_h: { green: '3-night mean ≥7 h', amber: '3-night mean 5.5 to <7 h', red: '3-night mean <5.5 h', ...reviewed },
  mood: { green: '3-day mean ≥3.5', amber: '3-day mean 2.5 to <3.5', red: '3-day mean <2.5', ...reviewed },
  body_mass_kg: { green: 'within 3% of baseline', amber: 'loss 3% to <5% vs baseline', red: 'loss ≥5% vs baseline', ...reviewed },
  stress: { green: 'baseline drift only', amber: 'baseline drift only', red: 'baseline drift only', ...reviewed },
  reaction: { green: 'baseline drift only', amber: 'baseline drift only', red: 'baseline drift only', ...reviewed },
} satisfies Record<string, ThresholdBand>

export const numericThresholds = {
  resting_hr: { redBelow: 40, redAtOrAbove: 120, amberBelow: 50, amberAtOrAbove: 100, ...reviewed },
  bp: { redSystolicBelow: 85, redSystolicAtOrAbove: 140, redDiastolicBelow: 55, redDiastolicAtOrAbove: 90, amberSystolicBelow: 90, amberSystolicAtOrAbove: 130, amberDiastolicBelow: 60, amberDiastolicAtOrAbove: 80, ...reviewed },
  temp_c: { redBelow: 35, redAtOrAbove: 38, amberBelow: 36, amberAtOrAbove: 37.5, ...reviewed },
  fasting_glucose: { redBelow: 54, redAtOrAbove: 126, amberBelow: 70, amberAtOrAbove: 100, ...reviewed },
  sleep_h: { amberBelow: 7, redBelow: 5.5, ...reviewed },
  mood: { amberBelow: 3.5, redBelow: 2.5, ...reviewed },
  body_mass_kg: { amberLossPct: 3, redLossPct: 5, ...reviewed },
} as const

export const radiationEventThreshold = {
  multiplier: 5,
  source: 'User-provided starter scenario rule; not a validated clinical threshold',
  needsClinicalReview: true,
} as const

export const indicatorFloors = {
  resting_hr: 3, bp: 4, temp_c: 0.15, sleep_h: 0.4, mood: 0.4, stress: 0.5,
  exercise_min: 12, reaction: 20, reaction_lapses: 1, body_mass_kg: 0.4,
  fasting_glucose: 5, dose: 0.05, symptoms: 1,
} satisfies Record<string, number>
