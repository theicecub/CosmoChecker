import { ExternalLink, Info } from 'lucide-react'
import { SOURCES } from '../config/mission'

export function AboutPanel() {
  return (
    <details className="about-panel">
      <summary><Info aria-hidden="true" /> About CosmoChecker & sources</summary>
      <div className="about-panel-content">
        <p>CosmoChecker is an educational prototype for personal tracking and mission-health awareness. It is not a medical device, does not diagnose or treat conditions, and does not replace crew procedures or flight-surgeon guidance.</p>
        <p>Thresholds are starter values that need clinical review. Sources provide background and are not a substitute for mission-specific instructions.</p>
        <ul>{SOURCES.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}<ExternalLink aria-hidden="true" /></a></li>)}</ul>
        <p className="about-offline-note">The app shell, personal check-ins, and queued packets are designed to work offline after the first successful load. No health information is sent automatically.</p>
      </div>
    </details>
  )
}
