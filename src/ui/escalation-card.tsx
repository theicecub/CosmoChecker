import { AlertTriangle, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react'
import type { Escalation } from '../engine/escalation'

export function EscalationCard({ escalation }: { escalation?: Escalation }) {
  const level = escalation?.level
  const Icon = !level || level === 'L1' || level === 'L2' ? Clock3 : level === 'L0' ? CheckCircle2 : level === 'L3' ? AlertTriangle : ShieldAlert
  return (
    <section className={`escalation-card ${level ? `escalation-${level.toLowerCase()}` : 'escalation-empty'}`} aria-labelledby="escalation-title" aria-live="polite">
      <span className="escalation-icon"><Icon aria-hidden="true" /></span>
      <div className="escalation-copy">
        <div className="escalation-heading"><p className="eyebrow">MISSION RESPONSE</p><span className="escalation-level">{level ?? '—'}</span></div>
        <h2 id="escalation-title">{escalation?.title ?? 'No check-in to assess'}</h2>
        <p>{escalation?.instruction ?? 'Save a daily check-in or switch to Demo to see the mission response guidance.'}</p>
        {escalation?.repeatFirst && <small>Single out-of-range readings may need a repeat measurement before escalation, unless symptoms are reported.</small>}
      </div>
      <p className="escalation-caveat">Prototype guidance only. Follow mission protocol and clinical direction.</p>
    </section>
  )
}
