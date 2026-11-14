import { useMissionStore } from '../state/mission-store'
import { RADIATION_PLACEHOLDER_RATES } from '../config/radiation'
import type { CrewAlert, DailyRecord, DestinationId } from '../config/types'

const destinations: Record<DestinationId, string> = {
  iss: 'ISS',
  moon_base: 'Moon base',
  mars_transit: 'Mars transit',
  mars_surface: 'Mars surface',
}

const issRadiationSource = 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp'

export function RadiationMonitor({
  destination,
  day,
  record,
  alert,
  active,
  onSelectRegion,
}: {
  destination: DestinationId
  day: number
  record?: DailyRecord
  alert?: CrewAlert
  active: boolean
  onSelectRegion: () => void
}) {
  const toggleHazard = useMissionStore((state) => state.toggleHazard)
  const hasDose = record?.daily_peak_dose_msv !== undefined

  return (
    <section className="radiation-monitor" aria-labelledby="radiation-title">
      <div className="radiation-heading">
        <div>
          <p className="eyebrow">FEATURE-FLAGGED SIMULATION</p>
          <h2 id="radiation-title">Radiation monitor</h2>
        </div>
        <span className="radiation-badge">NOT MISSION DATA</span>
      </div>
      <div className="radiation-metrics">
        <div className="radiation-metric">
          <span>Day {String(day).padStart(3, '0')} peak dose</span>
          <strong>{hasDose ? `${record.daily_peak_dose_msv!.toFixed(2)} mSv` : 'No local reading'}</strong>
          <small>{hasDose ? 'Seeded simulator feed' : 'No dose feed is connected in Live mode'}</small>
        </div>
        <div className="radiation-metric">
          <span>{destinations[destination]} reference rate</span>
          <strong>{RADIATION_PLACEHOLDER_RATES[destination].toFixed(2)} mSv/day</strong>
          <small>Illustrative placeholder only; not a measured rate or limit</small>
        </div>
      </div>
      {destination === 'iss' && (
        <p className="radiation-source-note">
          The Canadian Space Agency reports that neutrons contribute about 30% of radiation measured on the ISS.{' '}
          <a href={issRadiationSource} target="_blank" rel="noreferrer">Read the CSA source</a>.
        </p>
      )}
      {alert?.id === 'radiation_event' && (
        <div className="radiation-event" role="alert" aria-live="assertive">
          <strong>SIMULATED SOLAR PARTICLE EVENT · GO TO SHELTER</strong>
          <p>{alert.reasons.join(' ')}</p>
          <p>Use the designated shelter and follow the mission radiation protocol. This simulated alert is not a real-time warning.</p>
        </div>
      )}
      <div className="radiation-actions">
        <button type="button" className="secondary-button" aria-pressed={active} onClick={() => toggleHazard('radiation')}>
          {active ? 'Hide radiation overlay' : 'Show radiation overlay'}
        </button>
        <button type="button" className="text-button" onClick={onSelectRegion}>Open radiation explainer</button>
      </div>
    </section>
  )
}
