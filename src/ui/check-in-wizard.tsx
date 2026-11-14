import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Play, RotateCcw, X } from 'lucide-react'
import type { CrewId, DailyRecord } from '../config/types'
import { SYMPTOM_OPTIONS } from '../config/mission'
import { median } from '../engine/statistics'
import type { DailyCheckIn } from '../storage/checkins'
import { RppgEstimator } from './rppg-estimator'
import { FEATURE_FLAGS } from '../config/feature-flags'

interface ReactionResult { medianMs: number; lapses: number }
interface Draft {
  restingHr: string
  bpSys: string
  bpDia: string
  tempC: string
  sleepH: string
  sleepQuality: string
  mood: string
  stress: string
  exerciseMin: string
  bodyMassKg: string
  fastingGlucose: string
  sleepWindowKept: boolean
  hydrationPlanFollowed: boolean
}

function formatRemaining(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

const initialDraft: Draft = {
  restingHr: '', bpSys: '', bpDia: '', tempC: '', sleepH: '', sleepQuality: '4', mood: '3.5',
  stress: '2', exerciseMin: '0', bodyMassKg: '', fastingGlucose: '', sleepWindowKept: false, hydrationPlanFollowed: false,
}

function isWithin(value: string, minimum: number, maximum: number): boolean {
  const parsed = Number(value)
  return value.trim() !== '' && Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
}

function useDialog(open: boolean, onClose: () => void, headingRef: React.RefObject<HTMLHeadingElement>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  useEffect(() => {
    if (open) headingRef.current?.focus()
  }, [headingRef, open])
  return { dialogRef, onCancel: (event: React.SyntheticEvent<HTMLDialogElement>) => { event.preventDefault(); onClose() } }
}

function ReactionTest({ onComplete, enabled }: { onComplete: (result?: ReactionResult) => void; enabled: boolean }) {
  const [stage, setStage] = useState<'idle'|'ready'|'signal'|'done'>('idle')
  const [remaining, setRemaining] = useState(180)
  const [notice, setNotice] = useState('A signal will appear at unpredictable intervals. Tap only when it appears.')
  const [lastLatency, setLastLatency] = useState<number>()
  const [lapses, setLapses] = useState(0)
  const stageRef = useRef(stage)
  const cueAtRef = useRef(0)
  const endAtRef = useRef(0)
  const responsesRef = useRef<number[]>([])
  const lapsesRef = useRef(0)
  const cueTimerRef = useRef<number>()
  const missedTimerRef = useRef<number>()
  const clockRef = useRef<number>()

  function changeStage(next: typeof stage) {
    stageRef.current = next
    setStage(next)
  }

  function clearTimers() {
    window.clearTimeout(cueTimerRef.current)
    window.clearTimeout(missedTimerRef.current)
    window.clearInterval(clockRef.current)
  }

  function finish() {
    clearTimers()
    if (stageRef.current === 'signal') {
      lapsesRef.current += 1
      setLapses(lapsesRef.current)
    }
    changeStage('done')
    setRemaining(0)
    const values = responsesRef.current
    if (values.length) {
      onComplete({ medianMs: Math.round(median(values)), lapses: lapsesRef.current })
      setNotice(`${values.length} responses recorded. Median reaction time and missed signals are ready to save.`)
    } else {
      setNotice('No responses were recorded. Retake the 3-minute test before saving this check-in.')
    }
  }

  function scheduleSignal() {
    const delay = 2000 + Math.round(Math.random() * 8000)
    cueTimerRef.current = window.setTimeout(() => {
      if (performance.now() >= endAtRef.current) return
      cueAtRef.current = performance.now()
      changeStage('signal')
      setNotice('Signal — tap now.')
      missedTimerRef.current = window.setTimeout(() => {
        if (stageRef.current !== 'signal') return
        lapsesRef.current += 1
        setLapses(lapsesRef.current)
        changeStage('ready')
        setNotice('Signal missed. The test continues.')
        scheduleSignal()
      }, 3000)
    }, delay)
  }

  function start() {
    clearTimers()
    onComplete(undefined)
    responsesRef.current = []
    lapsesRef.current = 0
    setLapses(0)
    setLastLatency(undefined)
    setRemaining(180)
    setNotice('Stay ready. Tap when the signal appears.')
    endAtRef.current = performance.now() + 180000
    changeStage('ready')
    scheduleSignal()
    clockRef.current = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((endAtRef.current - performance.now()) / 1000))
      setRemaining(seconds)
      if (seconds <= 0) finish()
    }, 100)
  }

  function respond() {
    if (stageRef.current !== 'signal') return
    const latency = Math.max(0, Math.round(performance.now() - cueAtRef.current))
    responsesRef.current.push(latency)
    setLastLatency(latency)
    window.clearTimeout(missedTimerRef.current)
    if (latency > 500) {
      lapsesRef.current += 1
      setLapses(lapsesRef.current)
    }
    changeStage('ready')
    setNotice(latency > 500 ? 'Response over 500 ms recorded as a lapse. Stay ready.' : 'Response recorded. Stay ready for the next signal.')
    scheduleSignal()
  }

  useEffect(() => () => clearTimers(), [])
  useEffect(() => {
    if (!enabled && stageRef.current !== 'idle') {
      clearTimers()
      changeStage('idle')
      setRemaining(180)
      setNotice('A signal will appear at unpredictable intervals. Tap only when it appears.')
    }
  }, [enabled])

  return (
    <div className="reaction-test">
      <div className="reaction-header"><div><span className="test-kicker">3-MINUTE FOCUS CHECK</span><strong>{stage === 'done' ? 'Test complete' : stage === 'idle' ? 'Ready when you are' : 'Keep your focus'}</strong></div><span className="reaction-clock" aria-live="polite">{formatRemaining(remaining)}<small>left</small></span></div>
      <button type="button" className={`reaction-target reaction-${stage}`} onClick={respond} disabled={stage === 'idle' || stage === 'done'} aria-label={stage === 'signal' ? 'Tap the signal now' : 'Wait for the signal'}>
        {stage === 'signal' ? <span className="signal-core" aria-hidden="true" /> : <span className="signal-idle" aria-hidden="true" />}
      </button>
      <p className="reaction-instruction" aria-live="polite">{notice}</p>
      <div className="reaction-stats"><span>Responses <strong>{responsesRef.current.length}</strong></span><span>Missed <strong>{lapses}</strong></span>{lastLatency !== undefined && <span>Last <strong>{lastLatency} ms</strong></span>}</div>
      {stage === 'idle' || stage === 'done' ? (
        <button type="button" className="secondary-button test-start" onClick={start}>{stage === 'done' ? <RotateCcw aria-hidden="true" /> : <Play aria-hidden="true" />}{stage === 'done' ? 'Retake test' : 'Start 3-minute test'}</button>
      ) : <p className="test-running-hint">Signals appear every 2–10 seconds. Responses over 500 ms and missed signals count as lapses.</p>}
    </div>
  )
}

export function CheckInWizard({
  open,
  onClose,
  crewId,
  crewName,
  day,
  existing,
  onSave,
}: {
  open: boolean
  onClose: () => void
  crewId: CrewId
  crewName: string
  day: number
  existing?: DailyCheckIn
  onSave: (record: DailyRecord, privateNote: string) => Promise<void>
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(initialDraft)
  const [reaction, setReaction] = useState<ReactionResult>()
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [privateNote, setPrivateNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const { dialogRef, onCancel } = useDialog(open, onClose, titleRef)
  useEffect(() => {
    if (open && existing) {
      setStep(0)
      setDraft({
        restingHr: String(existing.resting_hr), bpSys: String(existing.bp_sys), bpDia: String(existing.bp_dia), tempC: String(existing.temp_c),
        sleepH: String(existing.sleep_h), sleepQuality: String(existing.sleep_quality), mood: String(existing.mood), stress: String(existing.stress),
        exerciseMin: String(existing.exercise_min), bodyMassKg: existing.body_mass_kg === undefined ? '' : String(existing.body_mass_kg),
        fastingGlucose: existing.fasting_glucose === undefined ? '' : String(existing.fasting_glucose),
        sleepWindowKept: existing.sleep_window_kept ?? false, hydrationPlanFollowed: existing.hydration_plan_followed ?? false,
      })
      setReaction({ medianMs: existing.reaction_median_ms, lapses: existing.reaction_lapses })
      setSymptoms(existing.symptoms)
      setPrivateNote(existing.privateNote ?? '')
      setError('')
    } else if (!open) {
      setStep(0)
      setDraft(initialDraft)
      setReaction(undefined)
      setSymptoms([])
      setPrivateNote('')
      setError('')
    }
  }, [existing?.id, open])

  function updateField(name: Exclude<keyof Draft, 'sleepWindowKept' | 'hydrationPlanFollowed'>, value: string) {
    setDraft((current) => ({ ...current, [name]: value }))
    setError('')
  }

  function validateStep(): boolean {
    if (step === 0) {
      const valid = isWithin(draft.restingHr, 30, 220) && isWithin(draft.bpSys, 50, 250) && isWithin(draft.bpDia, 30, 150) && isWithin(draft.tempC, 33, 42)
      if (!valid) setError('Enter each measurement within the field’s entry range. These bounds catch typos; they are not clinical thresholds.')
      return valid
    }
    if (step === 1) {
      const valid = isWithin(draft.sleepH, 0, 24) && isWithin(draft.sleepQuality, 1, 5) && isWithin(draft.mood, 1, 5) && isWithin(draft.stress, 1, 5) && isWithin(draft.exerciseMin, 0, 600)
        && (!draft.bodyMassKg || isWithin(draft.bodyMassKg, 20, 300)) && (!draft.fastingGlucose || isWithin(draft.fastingGlucose, 20, 600))
      if (!valid) setError('Check the sleep, mood, stress, exercise, and optional measurement fields.')
      return valid
    }
    if (step === 2 && !reaction) {
      setError('Complete the 3-minute reaction test. You can retake it before saving.')
      return false
    }
    return true
  }

  function nextStep() {
    if (!validateStep()) return
    setError('')
    setStep((current) => Math.min(3, current + 1))
  }

  async function saveCheckIn() {
    if (!reaction || !validateStep()) return
    setSaving(true)
    setError('')
    try {
      const record: DailyRecord = {
        crewId, day,
        resting_hr: Number(draft.restingHr), bp_sys: Number(draft.bpSys), bp_dia: Number(draft.bpDia),
        temp_c: Number(draft.tempC), sleep_h: Number(draft.sleepH), sleep_quality: Number(draft.sleepQuality),
        mood: Number(draft.mood), stress: Number(draft.stress), exercise_min: Number(draft.exerciseMin),
        reaction_median_ms: reaction.medianMs, reaction_lapses: reaction.lapses, symptoms,
        sleep_window_kept: draft.sleepWindowKept, hydration_plan_followed: draft.hydrationPlanFollowed,
        ...(draft.bodyMassKg ? { body_mass_kg: Number(draft.bodyMassKg) } : {}),
        ...(draft.fastingGlucose ? { fasting_glucose: Number(draft.fastingGlucose) } : {}),
      }
      await onSave(record, privateNote)
      setStep(0)
      setDraft(initialDraft)
      setReaction(undefined)
      setSymptoms([])
      setPrivateNote('')
      onClose()
    } catch {
      setError('This check-in could not be saved to this device. Please try again or check browser storage settings.')
    } finally {
      setSaving(false)
    }
  }

  function toggleSymptom(symptom: string) {
    setSymptoms((current) => current.includes(symptom) ? current.filter((item) => item !== symptom) : [...current, symptom])
  }

  return (
    <dialog ref={dialogRef} className="checkin-dialog" aria-labelledby="checkin-title" onCancel={onCancel}>
      <div className="checkin-shell">
        <header className="checkin-header">
          <div><p className="eyebrow">DAILY CHECK-IN · DAY {day}</p><h2 id="checkin-title" ref={titleRef} tabIndex={-1}>How are you feeling?</h2><p className="checkin-subtitle">A quick personal snapshot for {crewName}. Your notes stay on this device.</p></div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close check-in"><X aria-hidden="true" /></button>
        </header>
        <div className="wizard-progress" role="progressbar" aria-label="Check-in progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1}>
          <div className="wizard-progress-fill" style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>
        <div className="wizard-step-labels" aria-hidden="true">{['Vitals', 'Recovery', 'Reaction', 'Review'].map((label, index) => <span key={label} className={index <= step ? 'is-current' : ''}>{String(index + 1).padStart(2, '0')} {label}</span>)}</div>
        <div className="checkin-body">
          {step === 0 && (
            <section aria-labelledby="vitals-step-title">
              <div className="step-intro"><span className="step-number">01</span><div><h3 id="vitals-step-title">Start with the basics</h3><p>Use your usual device and the mission measurement procedure.</p></div></div>
              <div className="form-grid">
                <label className="entry-field"><span>Resting heart rate <small>bpm</small></span><input type="number" min="30" max="220" step="1" inputMode="numeric" value={draft.restingHr} onChange={(event) => updateField('restingHr', event.target.value)} placeholder="e.g. 64" /><small className="field-note">Sit quietly for 5 minutes and use the same device each day.</small></label>
                <label className="entry-field"><span>Temperature <small>°C</small></span><input type="number" min="33" max="42" step="0.1" inputMode="decimal" value={draft.tempC} onChange={(event) => updateField('tempC', event.target.value)} placeholder="e.g. 36.7" /><small className="field-note">Use the same approved thermometer and placement each time.</small></label>
                <label className="entry-field"><span>Blood pressure · systolic <small>mmHg</small></span><input type="number" min="50" max="250" step="1" inputMode="numeric" value={draft.bpSys} onChange={(event) => updateField('bpSys', event.target.value)} placeholder="e.g. 118" /><small className="field-note">Use the approved cuff; support your arm at heart level.</small></label>
                <label className="entry-field"><span>Blood pressure · diastolic <small>mmHg</small></span><input type="number" min="30" max="150" step="1" inputMode="numeric" value={draft.bpDia} onChange={(event) => updateField('bpDia', event.target.value)} placeholder="e.g. 76" /><small className="field-note">Record both values from the same cuff reading.</small></label>
              </div>
              <p className="input-note">Entry bounds only catch typos. They are not clinical thresholds.</p>
              {FEATURE_FLAGS.webcamPulseEstimate && <RppgEstimator onEstimate={(bpm) => updateField('restingHr', bpm === undefined ? '' : String(bpm))} />}
            </section>
          )}
          {step === 1 && (
            <section aria-labelledby="recovery-step-title">
              <div className="step-intro"><span className="step-number">02</span><div><h3 id="recovery-step-title">Sleep, mood & movement</h3><p>Rate how you feel today. There are no right answers.</p></div></div>
              <div className="form-grid">
                <label className="entry-field"><span>Sleep last night <small>hours</small></span><input type="number" min="0" max="24" step="0.1" inputMode="decimal" value={draft.sleepH} onChange={(event) => updateField('sleepH', event.target.value)} placeholder="e.g. 7.5" /></label>
                <label className="entry-field"><span>Sleep quality <small>1–5</small><output className="range-value">{draft.sleepQuality}</output></span><input type="range" min="1" max="5" step="1" value={draft.sleepQuality} onChange={(event) => updateField('sleepQuality', event.target.value)} aria-label="Sleep quality, 1 to 5" /></label>
                <label className="entry-field"><span>Mood <small>1 low · 5 high</small><output className="range-value">{Number(draft.mood).toFixed(1)}</output></span><input type="range" min="1" max="5" step="0.1" value={draft.mood} onChange={(event) => updateField('mood', event.target.value)} aria-label="Mood, 1 low to 5 high" /></label>
                <label className="entry-field"><span>Stress <small>1 low · 5 high</small><output className="range-value">{Number(draft.stress).toFixed(1)}</output></span><input type="range" min="1" max="5" step="0.1" value={draft.stress} onChange={(event) => updateField('stress', event.target.value)} aria-label="Stress, 1 low to 5 high" /></label>
                <label className="entry-field"><span>Exercise today <small>minutes</small></span><input type="number" min="0" max="600" step="1" inputMode="numeric" value={draft.exerciseMin} onChange={(event) => updateField('exerciseMin', event.target.value)} /><small className="field-note">Log your planned activity, even if today is a rest day.</small></label>
              </div>
              <div className="countermeasure-checks">
                <label className="checkin-habit"><input type="checkbox" checked={draft.sleepWindowKept} onChange={(event) => setDraft((current) => ({ ...current, sleepWindowKept: event.target.checked }))} /><span><strong>Kept my planned sleep window</strong><small>+5 points for logging this countermeasure</small></span><b>+5</b></label>
                <label className="checkin-habit"><input type="checkbox" checked={draft.hydrationPlanFollowed} onChange={(event) => setDraft((current) => ({ ...current, hydrationPlanFollowed: event.target.checked }))} /><span><strong>Followed my hydration plan</strong><small>+5 points for logging this countermeasure</small></span><b>+5</b></label>
              </div>
              <p className="optional-group-label">WEEKLY EXTRAS · OPTIONAL · LOG WHEN MEASURED</p>
              <div className="form-grid">
                <label className="entry-field"><span>Body mass <small>kg</small></span><input type="number" min="20" max="300" step="0.1" inputMode="decimal" value={draft.bodyMassKg} onChange={(event) => updateField('bodyMassKg', event.target.value)} placeholder="Skip if not measured" /></label>
                <label className="entry-field"><span>Fasting glucose <small>mg/dL</small></span><input type="number" min="20" max="600" step="1" inputMode="numeric" value={draft.fastingGlucose} onChange={(event) => updateField('fastingGlucose', event.target.value)} placeholder="Skip if not measured" /></label>
              </div>
            </section>
          )}
          <div hidden={step !== 2}>
            <section aria-labelledby="reaction-step-title">
              <div className="step-intro"><span className="step-number">03</span><div><h3 id="reaction-step-title">Take a 3-minute focus check</h3><p>Tap when the signal appears. This is a simple tracking task, not a diagnosis.</p></div></div>
              <ReactionTest onComplete={setReaction} enabled={open && step === 2} />
              {reaction && <p className="input-note">Current result: {reaction.medianMs} ms median · {reaction.lapses} missed. Retake the test to replace it.</p>}
            </section>
          </div>
          {step === 3 && (
            <section aria-labelledby="review-step-title">
              <div className="step-intro"><span className="step-number">04</span><div><h3 id="review-step-title">Symptoms & private note</h3><p>Choose any symptoms you want to log. Add a note only if it helps you.</p></div></div>
              <fieldset className="symptom-fieldset"><legend>How do you feel right now?</legend><div className="symptom-options">{SYMPTOM_OPTIONS.map(({ id, label }) => <label className="symptom-choice" key={id}><input type="checkbox" checked={symptoms.includes(id)} onChange={() => toggleSymptom(id)} /><span>{label}</span></label>)}</div></fieldset>
              <label className="private-note-field"><span><LockKeyhole aria-hidden="true" /> Private note <small>optional · saved on this device only</small></span><textarea value={privateNote} maxLength={1000} onChange={(event) => setPrivateNote(event.target.value)} placeholder="Anything you want to remember for yourself…" rows={4} /><small>{privateNote.length}/1000 characters · Stored in this browser’s IndexedDB. It is not uploaded or shared.</small></label>
              <div className="review-summary"><strong>Ready to save</strong><div><span>Mission day</span><b>{day}</b></div><div><span>Reaction time</span><b>{reaction?.medianMs ?? '—'} ms · {reaction?.lapses ?? 0} lapses</b></div><div><span>Symptoms selected</span><b>{symptoms.length || 'None'}</b></div><p>{existing ? 'Saving will replace this crew member’s existing check-in for this mission day.' : 'This record stays on this device unless you export it.'}</p></div>
            </section>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <footer className="checkin-footer">
          <button type="button" className="secondary-button" onClick={step === 0 ? onClose : () => { setError(''); setStep((current) => Math.max(0, current - 1)) }}><ArrowLeft aria-hidden="true" />{step === 0 ? 'Cancel' : 'Back'}</button>
          <span className="step-count">STEP {step + 1} OF 4</span>
          {step < 3 ? <button type="button" className="primary-button" onClick={nextStep}>Continue <ArrowRight aria-hidden="true" /></button> : <button type="button" className="primary-button" onClick={saveCheckIn} disabled={saving || !reaction}>{saving ? 'Saving…' : <><Check aria-hidden="true" /> Save check-in</>}</button>}
        </footer>
      </div>
    </dialog>
  )
}
