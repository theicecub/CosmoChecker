import { Activity, Pause, Play, RadioTower } from 'lucide-react'
import { CREW_MEMBERS, DESTINATIONS, HAZARDS } from '../config/mission'
import type { CrewId, ScenarioId } from '../config/types'
import { useMissionStore } from '../state/mission-store'

const scenarios: { id: ScenarioId; label: string }[] = [
  { id: 'baseline_ok', label: 'Baseline / no event' },
  { id: 'infection', label: 'Infection-like pattern' },
  { id: 'sleep_loss', label: 'Sleep loss' },
  { id: 'deconditioning', label: 'Exercise shortfall' },
  { id: 'spe', label: 'Radiation event' },
]

export function MissionControls({ liveRecordCount, latestLiveDay }: { liveRecordCount: number; latestLiveDay: number }) {
  const missionDay = useMissionStore((state) => state.missionDay)
  const isPlaying = useMissionStore((state) => state.isPlaying)
  const crewId = useMissionStore((state) => state.crewId)
  const destination = useMissionStore((state) => state.destination)
  const delay = useMissionStore((state) => state.oneWayDelaySeconds)
  const mode = useMissionStore((state) => state.mode)
  const scenario = useMissionStore((state) => state.scenario)
  const activeHazards = useMissionStore((state) => state.activeHazards)
  const setMissionDay = useMissionStore((state) => state.setMissionDay)
  const togglePlay = useMissionStore((state) => state.togglePlay)
  const setCrewId = useMissionStore((state) => state.setCrewId)
  const setDestination = useMissionStore((state) => state.setDestination)
  const setDelay = useMissionStore((state) => state.setDelay)
  const setMode = useMissionStore((state) => state.setMode)
  const setScenario = useMissionStore((state) => state.setScenario)
  const toggleHazard = useMissionStore((state) => state.toggleHazard)
  const mars = destination === 'mars_transit' || destination === 'mars_surface'
  const destinationProfile = DESTINATIONS[destination]
  const maxDay = mode === 'demo' ? 180 : Math.max(1, latestLiveDay)

  return (
    <section className="controls-card" aria-label="Mission controls">
      <div className="controls-heading">
        <div><p className="eyebrow">MISSION CONTROL</p><h2>Mission timeline</h2></div>
        <span className="mission-day-tag">DAY {String(missionDay).padStart(3, '0')} <i aria-hidden="true" /></span>
      </div>
      <div className="mission-select-grid">
        <label className="control-field"><span>Crew member</span>
          <select value={crewId} onChange={(event) => setCrewId(event.target.value as CrewId)}>
            {CREW_MEMBERS.map((member) => <option value={member.id} key={member.id}>{member.label}</option>)}
          </select>
        </label>
        <label className="control-field"><span>Destination</span>
          <select value={destination} onChange={(event) => setDestination(event.target.value as keyof typeof DESTINATIONS)}>
            {Object.entries(DESTINATIONS).map(([id, item]) => <option value={id} key={id}>{item.label}</option>)}
          </select>
        </label>
        <div className="control-field mode-control">
          <span id="data-mode-label">Data mode</span>
          <div className="mode-switch" role="group" aria-labelledby="data-mode-label">
            <button type="button" aria-pressed={mode === 'demo'} onClick={() => setMode('demo')}>Demo</button>
            <button type="button" aria-pressed={mode === 'live'} onClick={() => { setMode('live'); setMissionDay(Math.max(1, latestLiveDay)) }}>Live</button>
          </div>
        </div>
        {mode === 'demo' && (
          <label className="control-field scenario-field"><span>Scenario</span>
            <select value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioId)}>
              {scenarios.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
          </label>
        )}
      </div>
      {mode === 'live' && liveRecordCount === 0 ? (
        <div className="live-mode-note"><RadioTower aria-hidden="true" /><span>No on-device check-ins yet. Add one from Mission goals, or switch to Demo to explore generated mission data.</span></div>
      ) : (
        <div className="timeline-control">
          <div className="timeline-label-row"><label htmlFor="mission-day">Mission day</label><output htmlFor="mission-day">{missionDay} / {maxDay}</output></div>
          <div className="timeline-slider-row">
            {mode === 'demo' ? <button type="button" className="icon-button play-button" onClick={togglePlay} aria-label={isPlaying ? 'Pause mission playback' : 'Play mission timeline'}>{isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}</button> : <span className="timeline-local-icon" role="img" aria-label="On-device check-in history"><RadioTower aria-hidden="true" /></span>}
            <input id="mission-day" type="range" min="1" max={maxDay} step="1" value={Math.min(missionDay, maxDay)} onChange={(event) => setMissionDay(Number(event.target.value))} aria-label="Mission day" />
            <span className="timeline-end">{maxDay}</span>
          </div>
          <progress className="mission-progress" value={Math.min(missionDay, maxDay)} max={maxDay} aria-label={`Mission progress, day ${Math.min(missionDay, maxDay)} of ${maxDay}`} />
        </div>
      )}
      <div className="mission-conditions">
        <div className="condition-card"><span>Gravity</span><strong>{destinationProfile.gravityG === 0 ? 'Microgravity' : `${destinationProfile.gravityG.toFixed(2)} g`}</strong></div>
        <div className="condition-card"><span>One-way delay</span><strong>{delay < 60 ? `${delay.toFixed(1)} sec` : `${(delay / 60).toFixed(0)} min`}</strong></div>
        <div className="condition-card resupply-condition"><span>Resupply</span><strong>{destinationProfile.resupply}</strong></div>
      </div>
      {mars && <label className="delay-slider"><span>Earth communication delay <strong>{(delay / 60).toFixed(0)} min</strong></span><input type="range" min="180" max="1320" step="60" value={delay} onChange={(event) => setDelay(Number(event.target.value))} aria-label="Mars communication delay, minutes" /><span className="delay-range"><span>3 min</span><span>22 min</span></span></label>}
      <div className="hazard-lens">
        <div className="hazard-heading"><Activity aria-hidden="true" /><div><strong>Hazard lens</strong><span>Choose one or more mission conditions</span></div></div>
        <div className="hazard-buttons">
          {HAZARDS.map((hazard) => {
            const selected = activeHazards.includes(hazard.id)
            return <button type="button" key={hazard.id} className={selected ? 'hazard-chip is-active' : 'hazard-chip'} aria-pressed={selected} onClick={() => toggleHazard(hazard.id)}>{hazard.shortLabel}</button>
          })}
        </div>
      </div>
    </section>
  )
}
