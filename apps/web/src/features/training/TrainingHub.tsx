import { useMemo, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns'
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Zap } from 'lucide-react'
import { useTrainingInsights, useTrainingSessions } from '../../lib/api/hooks'

const isoDate = (date: Date) => format(date, 'yyyy-MM-dd')
const minutes = (seconds: number) => seconds < 60 ? '<1m' : `${Math.round(seconds / 60)}m`
const statusLabel: Record<string, string> = { planned: 'Planned', in_progress: 'In progress', completed: 'Complete', cancelled: 'Cancelled' }

export function TrainingHub({ navigate }: { navigate: (to: string) => void }) {
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [selected, setSelected] = useState(new Date())
  const [tab, setTab] = useState<'calendar'|'insights'>('calendar')
  const calendarStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const sessions = useTrainingSessions(isoDate(calendarStart), isoDate(calendarEnd))
  const days = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart.getTime(), calendarEnd.getTime()])
  const selectedSessions = sessions.data?.filter((session) => session.scheduledDate === isoDate(selected)) ?? []
  const byDay = useMemo(() => {
    const map = new Map<string, NonNullable<typeof sessions.data>>()
    for (const session of sessions.data ?? []) map.set(session.scheduledDate, [...(map.get(session.scheduledDate) ?? []), session])
    return map
  }, [sessions.data])

  const moveMonth = (direction: -1|1) => {
    const next = direction === 1 ? addMonths(month, 1) : subMonths(month, 1)
    setMonth(next)
    setSelected(startOfMonth(next))
  }

  return <section className="training-page">
    <header className="training-head">
      <div>
        <span className="eyebrow">Practice with intent</span>
        <h1>Training</h1>
        <p>Plan skills, run one focused block at a time, and see where your table time goes.</p>
      </div>
      <button className="button" onClick={() => navigate(`/training/new?date=${isoDate(selected)}&mode=planned`)}><Plus size={18}/> Plan session</button>
    </header>

    <div className="training-tabs" role="tablist" aria-label="Training sections">
      <button role="tab" aria-selected={tab === 'calendar'} className={tab === 'calendar' ? 'active' : ''} onClick={() => setTab('calendar')}><CalendarDays size={18}/> Calendar</button>
      <button role="tab" aria-selected={tab === 'insights'} className={tab === 'insights' ? 'active' : ''} onClick={() => setTab('insights')}><BarChart3 size={18}/> Insights</button>
    </div>

    {tab === 'calendar' ? <>
      <div className="calendar-toolbar">
        <button className="toolbar-icon" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft/></button>
        <h2>{format(month, 'MMMM yyyy')}</h2>
        <button className="toolbar-icon" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight/></button>
      </div>
      <div className="training-calendar" aria-label={`${format(month, 'MMMM yyyy')} training calendar`}>
        <div className="weekday-row" aria-hidden="true">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="month-grid">
          {days.map((day) => {
            const daySessions = byDay.get(isoDate(day)) ?? []
            const actual = daySessions.reduce((total, session) => total + session.actualDurationSeconds, 0)
            const hasComplete = daySessions.some((session) => session.status === 'completed')
            const hasPlan = daySessions.some((session) => session.status === 'planned' || session.status === 'in_progress')
            const state = hasComplete ? 'trained' : hasPlan ? 'planned' : 'empty'
            return <button
              key={isoDate(day)}
              className={`calendar-day ${state} ${isSameMonth(day, month) ? '' : 'outside'} ${isSameDay(day, selected) ? 'selected' : ''}`}
              aria-label={`${format(day, 'EEEE d MMMM')}${daySessions.length ? `, ${daySessions.length} sessions, ${minutes(actual)}` : ', no training'}`}
              aria-pressed={isSameDay(day, selected)}
              onClick={() => setSelected(day)}
            >
              <span className="day-number">{format(day, 'd')}</span>
              {daySessions.length > 0 && <span className="day-state">{state === 'trained' ? 'Done' : 'Plan'}</span>}
              {actual > 0 && <strong>{minutes(actual)}</strong>}
            </button>
          })}
        </div>
      </div>

      <div className="selected-day-head">
        <div><span className="eyebrow">{isSameDay(selected, new Date()) ? 'Today' : format(selected, 'EEEE')}</span><h2>{format(selected, 'd MMMM')}</h2></div>
        <div className="day-actions">
          <button className="button secondary" onClick={() => navigate(`/training/new?date=${isoDate(selected)}&mode=quick`)}><Zap size={17}/> Quick start</button>
          {selected <= new Date() && <button className="button secondary" onClick={() => navigate(`/training/new?date=${isoDate(selected)}&mode=manual`)}><Clock3 size={17}/> Log</button>}
        </div>
      </div>

      {sessions.isLoading && <div className="library-skeleton">Loading training calendar…</div>}
      {sessions.isError && <div className="notice">We could not load this month. Check your connection and try again.</div>}
      {!sessions.isLoading && selectedSessions.length === 0 && <div className="training-empty">
        <CalendarDays size={28}/>
        <strong>No training on this day</strong>
        <span>Add a skill plan now, or log the work after practice.</span>
        <button className="button" onClick={() => navigate(`/training/new?date=${isoDate(selected)}&mode=planned`)}>Plan this day</button>
      </div>}
      <div className="day-session-list">
        {selectedSessions.map((session) => <button key={session.id} className="session-row" onClick={() => navigate(session.status === 'in_progress' ? `/training/${session.id}/run` : `/training/${session.id}`)}>
          <span className={`session-symbol ${session.status}`}><Clock3 size={19}/></span>
          <span className="session-copy"><strong>{session.title}</strong><small>{session.skillNames.join(' · ') || 'Training session'}</small></span>
          <span className="session-meta"><strong>{session.actualDurationSeconds ? minutes(session.actualDurationSeconds) : minutes(session.plannedDurationSeconds)}</strong><small>{session.entryMode === 'manual' ? 'Manual log' : statusLabel[session.status]}</small></span>
          <ChevronRight size={18}/>
        </button>)}
      </div>
    </> : <TrainingInsights month={month}/>}
  </section>
}

function TrainingInsights({ month }: { month: Date }) {
  const [range, setRange] = useState<'week'|'month'>('month')
  const to = range === 'month' ? endOfMonth(month) : new Date()
  const from = range === 'month' ? startOfMonth(month) : subDays(to, 6)
  const insights = useTrainingInsights(isoDate(from), isoDate(to))
  const data = insights.data
  const maxSkillTime = Math.max(1, ...(data?.skills.map((skill) => skill.actualDurationSeconds) ?? [1]))
  const planRate = data?.plannedSessions ? Math.round((data.completedPlannedSessions / data.plannedSessions) * 100) : 0
  return <div className="insights-view">
    <div className="insight-range" aria-label="Insight range">
      <button className={range === 'week' ? 'active' : ''} onClick={() => setRange('week')}>Last 7 days</button>
      <button className={range === 'month' ? 'active' : ''} onClick={() => setRange('month')}>This month</button>
    </div>
    {insights.isLoading && <div className="library-skeleton">Calculating your training summary…</div>}
    {insights.isError && <div className="notice">We could not calculate insights right now.</div>}
    {data && <>
      <dl className="training-summary">
        <div><dt>Training days</dt><dd>{data.trainingDays}</dd></div>
        <div><dt>Active time</dt><dd>{minutes(data.actualDurationSeconds)}</dd></div>
        <div><dt>Plans completed</dt><dd>{data.plannedSessions ? `${planRate}%` : 'No plans'}</dd></div>
        <div><dt>Plan vs actual</dt><dd>{minutes(data.plannedDurationSeconds)} / {minutes(data.actualDurationSeconds)}</dd></div>
      </dl>
      <div className="skill-time-section">
        <div><span className="eyebrow">Where time went</span><h2>Skills trained</h2></div>
        {data.skills.length === 0 ? <div className="training-empty"><BarChart3 size={28}/><strong>No practice data yet</strong><span>Complete a timed session or add a manual log to build this view.</span></div> :
          <div className="skill-time-list">{data.skills.map((skill) => <div className="skill-time-row" key={skill.skillId}>
            <div><strong>{skill.skillName}</strong><small>{minutes(skill.actualDurationSeconds)} actual · {minutes(skill.plannedDurationSeconds)} planned</small></div>
            <div className="time-bar" aria-label={`${skill.skillName}, ${minutes(skill.actualDurationSeconds)}`}><span style={{ width: `${Math.max(4, skill.actualDurationSeconds / maxSkillTime * 100)}%` }}/></div>
            <span className="confidence-mark">{skill.latestConfidenceRating ? `${skill.latestConfidenceRating}/5` : 'No check-in'}{skill.latestConfidenceRating && skill.previousConfidenceRating ? <small>{skill.latestConfidenceRating > skill.previousConfidenceRating ? 'Improving' : skill.latestConfidenceRating < skill.previousConfidenceRating ? 'Lower today' : 'Steady'}</small> : null}</span>
          </div>)}</div>}
      </div>
    </>}
  </div>
}
