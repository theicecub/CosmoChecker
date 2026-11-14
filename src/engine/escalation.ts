import type { CrewAlert, Severity } from '../config/types'

export type EscalationLevel = 'L0'|'L1'|'L2'|'L3'|'L4'
export interface Escalation { level: EscalationLevel; title: string; instruction: string; repeatFirst: boolean }

const rank: Record<EscalationLevel, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 }

export function selectEscalation(alerts: CrewAlert[], worstStatus: Severity, singleRedNeedsRepeat = false, oneWayDelaySeconds = 0): Escalation {
  const highest = alerts.reduce<EscalationLevel>((level, alert) => rank[alert.level] > rank[level] ? alert.level : level, 'L0')
  const level: EscalationLevel = singleRedNeedsRepeat ? 'L1' : highest !== 'L0' ? highest : worstStatus === 'red' ? 'L3' : worstStatus === 'amber' ? 'L1' : 'L0'
  const delayed = oneWayDelaySeconds > 60 && (level === 'L3' || level === 'L4')
  const labels: Record<EscalationLevel, string> = {
    L0: 'All clear', L1: 'Self-care', L2: 'Monitor and re-measure', L3: 'Message the flight surgeon', L4: 'Urgent: contact now',
  }
  const instruction = singleRedNeedsRepeat
    ? 'Re-measure after 5 minutes at rest before escalating, unless symptoms are reported.'
    : delayed
      ? 'Start now, send in parallel; do not wait for a reply.'
      : level === 'L2'
        ? 'Follow the mission protocol and re-measure in the interval it specifies.'
        : level === 'L3'
          ? 'Message the flight surgeon and follow the mission health protocol.'
          : level === 'L4'
            ? 'Use the emergency checklist and contact the flight surgeon now.'
            : level === 'L1'
              ? 'Choose a self-care action and check again as planned.'
              : 'Continue routine measurements.'
  return { level, title: labels[level], instruction, repeatFirst: singleRedNeedsRepeat }
}
