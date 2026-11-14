import { Activity, CheckCircle2, ChevronRight } from 'lucide-react'
import type { CrewAlert } from '../config/types'

const alertLabels: Record<CrewAlert['id'], string> = {
  infection_like: 'Infection-like pattern',
  sleep_debt: 'Sleep debt pattern',
  deconditioning: 'Exercise shortfall',
  mood_drift: 'Mood trend',
  radiation_event: 'Radiation event',
}

export function AlertFeed({ alerts, hasData }: { alerts: CrewAlert[]; hasData: boolean }) {
  return (
    <section className="alert-section" aria-labelledby="alert-title">
      <div className="section-title-row"><div><p className="eyebrow">PATTERN WATCH</p><h2 id="alert-title">Signals to review</h2></div><span className="alert-count">{alerts.length} active</span></div>
      {alerts.length ? (
        <div className="alert-grid">
          {alerts.map((alert) => (
            <article className={`alert-card alert-${alert.level.toLowerCase()}`} key={alert.id}>
              <div className="alert-card-top"><span className="alert-icon"><Activity aria-hidden="true" /></span><span className="alert-level">{alert.level}</span></div>
              <h3>{alertLabels[alert.id]}</h3>
              <p className="alert-foot">Mission day {alert.day}</p>
              <ul className="alert-reasons">{alert.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <div className="alert-next-steps"><strong>Next steps</strong><ul>{alert.actions.map((action) => <li key={action}><ChevronRight aria-hidden="true" />{action}</li>)}</ul></div>
            </article>
          ))}
        </div>
      ) : (
        <div className="quiet-state"><span className="quiet-icon"><CheckCircle2 aria-hidden="true" /></span><div><strong>{hasData ? 'No active patterns at this mission day' : 'No check-ins to assess yet'}</strong><p>{hasData ? 'Signals are compared with the selected crew member’s available personal history.' : 'Add an on-device check-in or switch to Demo to explore generated mission patterns.'}</p></div></div>
      )}
    </section>
  )
}
