import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Eye, FileText, Heart, Orbit, ShieldCheck, Signal, Sparkles } from 'lucide-react'
import { generateMission } from './sim/generator'
import { evaluateCrew } from './engine'
import type { CrewAssessment } from './engine'
import type { DailyRecord, RegionId } from './config/types'
import { CREW_MEMBERS, HAZARDS } from './config/mission'
import { useMissionStore } from './state/mission-store'
import { BodyMap } from './ui/body-map'
import type { MapRegion } from './ui/body-map'
import { MissionControls } from './ui/mission-controls'
import { RegionPanel } from './ui/region-panel'
import { CheckInWizard } from './ui/check-in-wizard'
import { DailyGoals } from './ui/daily-goals'
import { SupportCard } from './ui/support-card'
import { useCheckIns } from './storage/use-checkins'
import { usePackets } from './storage/use-packets'
import { PacketDialog } from './ui/packet-dialog'
import { EscalationCard } from './ui/escalation-card'
import { AlertFeed } from './ui/alert-feed'
import { AboutPanel } from './ui/about-panel'
import { OfflineStatus } from './ui/offline-status'
import { RadiationMonitor } from './ui/radiation-monitor'
import { FEATURE_FLAGS } from './config/feature-flags'

const blankRegionStatuses: Record<RegionId, 'green'|'amber'|'red'> = {
  heart_vessels: 'green', bones_muscle: 'green', brain_eyes: 'green', inner_ear: 'green',
  immune: 'green', gut_nutrition: 'green', mind_sleep: 'green',
}

export function App() {
  const missionDay = useMissionStore((state) => state.missionDay)
  const isPlaying = useMissionStore((state) => state.isPlaying)
  const crewId = useMissionStore((state) => state.crewId)
  const destination = useMissionStore((state) => state.destination)
  const delay = useMissionStore((state) => state.oneWayDelaySeconds)
  const mode = useMissionStore((state) => state.mode)
  const scenario = useMissionStore((state) => state.scenario)
  const activeHazards = useMissionStore((state) => state.activeHazards)
  const advanceDay = useMissionStore((state) => state.advanceDay)
  const setMode = useMissionStore((state) => state.setMode)
  const setMissionDay = useMissionStore((state) => state.setMissionDay)
  const { checkIns, error: storageError, isLoading: checkInsLoading, save } = useCheckIns()
  const { packets: packetQueue, enqueue: queuePacket, setSent: setPacketSent } = usePackets()
  const [selectedRegion, setSelectedRegion] = useState<MapRegion>('heart_vessels')
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [packetOpen, setPacketOpen] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const crewCheckIns = useMemo(() => checkIns.filter((record) => record.crewId === crewId), [checkIns, crewId])
  const latestLiveDay = crewCheckIns.reduce((latest, record) => Math.max(latest, record.day), 1)
  const records = useMemo(() => mode === 'demo' ? generateMission(42, scenario) : checkIns, [checkIns, mode, scenario])
  const hasCrewDataAtDay = crewCheckIns.some((record) => record.day <= missionDay)
  const assessment: CrewAssessment | undefined = useMemo(
    () => mode === 'demo' || hasCrewDataAtDay ? evaluateCrew(records, crewId, missionDay, delay) : undefined,
    [crewId, delay, hasCrewDataAtDay, missionDay, mode, records],
  )
  const dataAvailable = mode === 'demo' || hasCrewDataAtDay
  const latestCheckIn = [...crewCheckIns].filter((record) => record.day <= missionDay).sort((left, right) => right.day - left.day)[0]
  const existingCheckIn = checkIns.find((record) => record.crewId === crewId && record.day === missionDay)
  const radiationRecord = records.find((record) => record.crewId === crewId && record.day === missionDay)
  const radiationAlert = assessment?.alerts.find((alert) => alert.id === 'radiation_event')

  async function saveCheckIn(record: DailyRecord, privateNote: string) {
    await save(record, privateNote)
    setMode('live')
    setMissionDay(record.day)
    setSelectedRegion('heart_vessels')
  }

  useEffect(() => {
    if (!isPlaying || mode !== 'demo') return
    const timer = window.setInterval(advanceDay, 1100)
    return () => window.clearInterval(timer)
  }, [advanceDay, isPlaying, mode])

  const currentAlerts = assessment?.alerts ?? []
  const statusCounts = assessment ? Object.values(assessment.regionStatuses).reduce((counts, status) => {
    counts[status] += 1
    return counts
  }, { green: 0, amber: 0, red: 0 }) : undefined
  const activeHazardNames = HAZARDS.filter((hazard) => activeHazards.includes(hazard.id)).map((hazard) => hazard.label)
  const currentCrewLabel = CREW_MEMBERS.find((member) => member.id === crewId)?.label ?? 'Crew member'

  return (
    <div className="app-frame" data-contrast={highContrast ? 'high' : undefined}>
      <header className="topbar">
        <a className="brand-lockup" href="#main" aria-label="OrbitVitals home">
          <span className="brand-mark"><Orbit aria-hidden="true" /></span>
          <span><strong>OrbitVitals</strong><small>MISSION HEALTH</small></span>
        </a>
        <div className="topbar-right">
          <span className="prototype-tag"><span aria-hidden="true" /> PROTOTYPE</span>
          <span className="live-signal"><Signal aria-hidden="true" /> {mode === 'demo' ? 'SIM DATA' : crewCheckIns.length ? 'LOCAL CHECK-INS' : 'NO CHECK-INS'}</span>
          <OfflineStatus />
          <button type="button" className="contrast-toggle" aria-pressed={highContrast} aria-label={highContrast ? 'Disable high contrast' : 'Enable high contrast'} onClick={() => setHighContrast((value) => !value)}><Eye aria-hidden="true" /><span>Contrast</span></button>
          <a className="topbar-support" href="#support-card" aria-label="I want to talk to someone" title="I want to talk to someone"><Heart aria-hidden="true" /><span>Support</span></a>
        </div>
      </header>

      <main id="main" className="dashboard-main">
        <section className="welcome-row" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">MISSION HEALTH SYSTEMS <span aria-hidden="true">/</span> DAY {String(missionDay).padStart(3, '0')}</p>
            <h1 id="page-title">A clear view of your health, wherever the mission takes you.</h1>
            <p className="welcome-copy">A personal health snapshot built around your baseline, your mission, and the signals worth noticing.</p>
          </div>
          <div className="health-status-card">
            <span className="health-status-icon"><ShieldCheck aria-hidden="true" /></span>
            <div><span>Mission status</span><strong>{assessment?.escalation.title ?? 'Live data unavailable'}</strong></div>
            <span className={`status-dot status-${assessment?.escalation.level === 'L0' ? 'green' : assessment?.escalation.level === 'L1' ? 'amber' : assessment?.escalation.level === 'L2' ? 'amber' : assessment?.escalation.level ? 'red' : 'empty'}`} aria-hidden="true" />
          </div>
        </section>

        <div className="dashboard-summary" aria-label="Mission data summary">
          <div className="summary-item"><span>Current crew</span><strong>{currentCrewLabel}</strong></div>
          <div className="summary-item"><span>Destination</span><strong>{destination.replace('_', ' ')}</strong></div>
          <div className="summary-item"><span>Baseline coverage</span><strong>{assessment ? `${Object.keys(assessment.baselines).length} indicators` : 'No live records'}</strong></div>
          <div className="summary-item"><span>Region status</span><strong>{statusCounts ? `${statusCounts.green} clear · ${statusCounts.amber} monitor · ${statusCounts.red} action` : 'Awaiting connection'}</strong></div>
        </div>
        <div className="dashboard-actions">
          <p>Health data stays on this device until you choose an export.</p>
          <button type="button" className="secondary-button packet-open-button" onClick={() => setPacketOpen(true)}><FileText aria-hidden="true" /> Flight Surgeon Packet <span>{packetQueue.length}</span></button>
        </div>
        <EscalationCard escalation={assessment?.escalation} />

        <div className="engagement-grid">
          <DailyGoals crewId={crewId} day={missionDay} checkIns={checkIns} mode={mode} onOpenCheckIn={() => setCheckInOpen(true)} />
          <SupportCard latest={latestCheckIn} />
        </div>
        {storageError && <p className="storage-error" role="alert">Local check-ins could not be read from this browser. Check site storage permissions before saving private data.</p>}
        {!storageError && checkInsLoading && <p className="loading-note" role="status">Checking for saved on-device check-ins…</p>}
        <MissionControls liveRecordCount={crewCheckIns.length} latestLiveDay={latestLiveDay} />
        {FEATURE_FLAGS.radiationMonitor && <RadiationMonitor destination={destination} day={missionDay} record={radiationRecord} alert={radiationAlert} active={activeHazards.includes('radiation')} onSelectRegion={() => setSelectedRegion('radiation')} />}

        <section className="hazard-summary" aria-live="polite">
          <div className="hazard-summary-icon"><Sparkles aria-hidden="true" /></div>
          <div>
            <strong>{activeHazardNames.length ? 'Hazard lens active' : 'Mission context'}</strong>
            <p>{activeHazardNames.length ? `Highlighting ${activeHazardNames.join(', ').toLowerCase()} across the body map.` : 'Select a hazard lens to see where mission conditions may intersect with health systems.'}</p>
          </div>
          {activeHazards.includes('distance') && <span className="delay-note"><Signal aria-hidden="true" /> {delay < 60 ? `${delay.toFixed(1)} sec` : `${(delay / 60).toFixed(0)} min`} one-way</span>}
        </section>

        <div className="dashboard-grid">
          <section className="panel body-map-card" aria-labelledby="body-map-title">
            <div className="panel-heading">
              <div><p className="eyebrow">HEALTH SYSTEMS</p><h2 id="body-map-title">Crew health map</h2></div>
              <span className="panel-meta">{assessment ? 'PERSONALIZED' : 'NO DATA'}</span>
            </div>
            <p className="panel-intro">Select a region for measurements, personal trends, and practical guidance.</p>
            {mode === 'live' && crewCheckIns.length === 0 && <div className="no-data-banner"><AlertTriangle aria-hidden="true" /><span>No check-ins are saved for this crew member yet. Your entries stay on this device; no live health feed is connected.</span></div>}
            <BodyMap statuses={assessment?.regionStatuses ?? blankRegionStatuses} activeHazards={activeHazards} selected={selectedRegion} dataAvailable={dataAvailable} radiationStatus={assessment?.radiationOverlayStatus ?? 'green'} onSelect={setSelectedRegion} />
          </section>
          <RegionPanel region={selectedRegion} crewId={crewId} day={missionDay} records={records} assessment={assessment} statuses={assessment?.regionStatuses ?? blankRegionStatuses} dataAvailable={dataAvailable} />
        </div>

        <AlertFeed alerts={currentAlerts} hasData={dataAvailable} />

        <footer className="disclaimer-footer">
          <strong>Educational prototype — not a medical device.</strong>
          <span>Thresholds are starter values and require clinical review. This tool does not diagnose, treat, or replace mission procedures or advice from a flight surgeon.</span>
        </footer>
        <AboutPanel />
      </main>
      <CheckInWizard open={checkInOpen} onClose={() => setCheckInOpen(false)} crewId={crewId} crewName={currentCrewLabel} day={missionDay} existing={existingCheckIn} onSave={saveCheckIn} />
      <PacketDialog open={packetOpen} onClose={() => setPacketOpen(false)} packet={dataAvailable ? assessment?.packet : undefined} queue={packetQueue} onQueue={queuePacket} onToggleSent={setPacketSent} />
    </div>
  )
}
