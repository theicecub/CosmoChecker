import { Award, Check, ChevronRight, Circle, Flame, Target, Users } from 'lucide-react'
import { CREW_MEMBERS } from '../config/mission'
import type { CrewId } from '../config/types'
import type { DailyCheckIn } from '../storage/checkins'

export function DailyGoals({
  crewId,
  day,
  checkIns,
  mode,
  onOpenCheckIn,
}: {
  crewId: CrewId
  day: number
  checkIns: DailyCheckIn[]
  mode: 'demo' | 'live'
  onOpenCheckIn: () => void
}) {
  const crewCheckIns = checkIns.filter((record) => record.crewId === crewId).sort((left, right) => left.day - right.day)
  const today = crewCheckIns.find((record) => record.day === day)
  const loggedDays = [...new Set(crewCheckIns.map((record) => record.day))].sort((left, right) => right - left)
  let streak = 0
  let expectedDay = today ? day : (loggedDays[0] ?? day)
  for (const loggedDay of loggedDays) {
    if (loggedDay === expectedDay) { streak += 1; expectedDay -= 1 }
    else if (loggedDay < expectedDay) break
  }
  const points = crewCheckIns.reduce((total, record) => total + 25 + (record.sleep_window_kept ? 5 : 0) + (record.hydration_plan_followed ? 5 : 0), 0) + Math.floor(streak / 3) * 5
  const goals = [
    { title: 'Complete today’s check-in', detail: today ? 'Measurements saved on this device' : 'Vitals, sleep, exercise, reaction, and symptoms', complete: Boolean(today), points: 20 },
    { title: 'Log sleep & exercise', detail: today ? `${today.sleep_h.toFixed(1)} h sleep · ${today.exercise_min} min recorded` : 'Capture sleep and planned movement', complete: Boolean(today), points: 5 },
    { title: 'Keep the planned sleep window', detail: today?.sleep_window_kept ? 'Marked in today’s check-in' : 'Mark this countermeasure if you kept it', complete: Boolean(today?.sleep_window_kept), points: 5 },
    { title: 'Follow the hydration plan', detail: today?.hydration_plan_followed ? 'Marked in today’s check-in' : 'Mark this countermeasure if you followed it', complete: Boolean(today?.hydration_plan_followed), points: 5 },
    { title: 'Build a three-day log streak', detail: `${Math.min(streak, 3)} of 3 consecutive mission days`, complete: streak >= 3, points: 5 },
  ]
  const weekStart = Math.max(1, day - 6)
  const weekDays = Array.from({ length: day - weekStart + 1 }, (_, index) => weekStart + index)
  const hasCrewCheckIn = (crewMember: CrewId, missionDay: number) => mode === 'demo' && crewMember !== crewId
    ? true
    : checkIns.some((record) => record.crewId === crewMember && record.day === missionDay)
  const fullCrewDays = weekDays.filter((missionDay) => CREW_MEMBERS.every((member) => hasCrewCheckIn(member.id, missionDay))).length
  const crewTodayCount = CREW_MEMBERS.filter((member) => hasCrewCheckIn(member.id, day)).length
  const suggestions = [
    'Protect a steady sleep window when your schedule allows.',
    'Reserve an exercise slot that fits your mission plan.',
    'Try a brief crew activity or call home if that feels helpful.',
  ]

  return (
    <section className="panel goals-card" aria-labelledby="goals-title">
      <div className="panel-heading">
        <div><p className="eyebrow">DAILY RHYTHM</p><h2 id="goals-title">Mission goals</h2></div>
        <span className="points-pill"><Award aria-hidden="true" /> {points} pts</span>
      </div>
      <p className="goals-intro">Points reward logging and countermeasure habits—not health readings.</p>
      <div className="goals-list">
        {goals.map((goal, index) => (
          <div className={`goal-row${goal.complete ? ' is-complete' : ''}`} key={goal.title}>
            <span className="goal-check" aria-hidden="true">{goal.complete ? <Check /> : <Circle />}</span>
            <span className="goal-copy"><strong>{goal.title}</strong><small>{goal.detail}</small></span>
            <span className="goal-points">+{goal.points}</span>
            {index === 4 && <Flame className="streak-icon" aria-label={`${streak} day check-in streak`} />}
          </div>
        ))}
      </div>
      <button type="button" className="primary-button goal-cta" onClick={onOpenCheckIn}>{today ? 'Update check-in' : 'Start today’s check-in'} <ChevronRight aria-hidden="true" /></button>
      <div className="mission-plan-note"><Target aria-hidden="true" /><span>Exercise goal: follow your mission plan. Example plan: 120 min on 6 of 7 days.</span></div>
      <div className="crew-goal">
        <div className="crew-goal-heading"><span><Users aria-hidden="true" /> Cooperative crew goal</span><strong>{fullCrewDays}/7 days</strong></div>
        <progress value={fullCrewDays} max={7} aria-label={`All crew check-in goal, ${fullCrewDays} of 7 days`} />
        <p>{crewTodayCount}/{CREW_MEMBERS.length} crew check-ins logged for mission day {day}. Goal: everyone on 6 of 7 days.</p>
        <small>{mode === 'demo' ? 'Other demo crewmates are simulated; your entries stay local.' : 'Only on-device entries count. Check-ins are not shared between crew members.'}</small>
      </div>
      {today && <div className="suggestion-block"><p className="eyebrow">SMALL NEXT STEPS</p><ul>{suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div>}
    </section>
  )
}
