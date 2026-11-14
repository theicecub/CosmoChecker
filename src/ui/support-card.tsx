import { useState } from 'react'
import { Heart, LockKeyhole, MessageCircle, Sparkles } from 'lucide-react'
import type { DailyCheckIn } from '../storage/checkins'

function supportiveMessage(latest?: DailyCheckIn): string {
  if (!latest) return 'A small check-in can help you notice what you need. Your health numbers do not define you.'
  if (latest.mood <= 2.5 || latest.stress >= 4.5) return 'This may feel like a demanding stretch. If it would help, consider reaching out to a trusted crewmate or your crew health lead.'
  if (latest.sleep_h < 6) return 'Rest can be hard to protect during mission work. Consider asking your crew to help protect a steady wind-down window.'
  return 'You are more than the numbers on this page. Take a moment to notice what is going well and what support would help today.'
}

export function SupportCard({ latest }: { latest?: DailyCheckIn }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <aside id="support-card" className="support-card" aria-labelledby="support-title" tabIndex={-1}>
      <div className="support-topline"><span className="support-icon"><Heart aria-hidden="true" /></span><span className="private-tag"><LockKeyhole aria-hidden="true" /> DEVICE-ONLY</span></div>
      <p className="eyebrow">CREW HEALTH SUPPORT</p>
      <h2 id="support-title">You don’t have to figure it out alone.</h2>
      <p className="support-message">{supportiveMessage(latest)}</p>
      <button type="button" className="support-action" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}><MessageCircle aria-hidden="true" /> {expanded ? 'Hide support ideas' : 'I want to talk to someone'}</button>
      {expanded && <ul className="support-ideas"><li>Take a brief pause in a quiet place, if your tasks allow.</li><li>Share what is on your mind with a trusted crewmate.</li><li>Use your mission health contact or procedures when you want professional support.</li></ul>}
      <div className="private-note-banner"><Sparkles aria-hidden="true" /><span>Your check-ins and private notes stay in this browser. They are not uploaded or shared by this prototype.</span></div>
      <p className="support-emergency">If you feel unsafe or need immediate help, follow the mission emergency procedures.</p>
    </aside>
  )
}
