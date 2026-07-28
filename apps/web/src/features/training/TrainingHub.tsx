import { useCallback, useEffect, useMemo, useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns'
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Clock3, Users, Zap } from 'lucide-react'
import { useTrainingInsights, useTrainingProfiles, useTrainingSessions } from '../../lib/api/hooks'
import { isMissedTrainingSession, trainingDayState, trainingDayStateLabel } from './calendarState'
import { TrainingProfileDrawer } from './TrainingProfileSwitcher'
import { useMobilePageActions } from '../../components/MobilePageActions'
import { setActiveTrainingProfileId, useActiveTrainingProfileId } from '../../lib/trainingProfileSelection'

const isoDate = (date: Date) => format(date, 'yyyy-MM-dd')
const minutes = (seconds: number) => seconds < 60 ? '<1m' : `${Math.round(seconds / 60)}m`
const statusLabel: Record<string, string> = { planned: 'Planned', in_progress: 'In progress', completed: 'Complete', cancelled: 'Cancelled' }

export function TrainingHub({ navigate }: { navigate: (to: string) => void }) {
  const [view, setView] = useState<'calendar' | 'insights'>('calendar')
  const [month, setMonth] = useState(startOfMonth(new Date()))
  const [selected, setSelected] = useState(new Date())
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const today = isoDate(new Date())
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
  const profiles = useTrainingProfiles()
  const activeProfileId = useActiveTrainingProfileId()
  const selfProfile = profiles.data?.find((profile) => profile.isSelf)
  const activeProfile = profiles.data?.find((profile) => profile.id === activeProfileId) ?? selfProfile

  useEffect(() => {
    if (!profiles.data?.length || activeProfile) return
    const fallback = selfProfile ?? profiles.data[0]
    if (fallback) setActiveTrainingProfileId(fallback.id)
  }, [profiles.data, activeProfile, selfProfile])

  const toggleInsights = useCallback(() => setView((v) => v === 'insights' ? 'calendar' : 'insights'), [])

  const hasMultipleProfiles = (profiles.data?.length ?? 0) > 1

  const pageActions = useMemo(() => [
    {
      id: 'training-profile',
      label: `Switch or manage training player${activeProfile ? `, currently ${activeProfile.displayName}` : ''}`,
      icon: <Users size={18} aria-hidden="true" />,
      text: hasMultipleProfiles ? (activeProfile?.isSelf ? 'Me' : activeProfile?.displayName ?? 'Player') : undefined,
      onPress: () => setProfileDrawerOpen(true),
    },
    {
      id: 'training-insights',
      label: view === 'insights' ? 'Back to calendar' : 'Show insights',
      icon: <BarChart3 size={18} aria-hidden="true" />,
      onPress: toggleInsights,
    },
  ], [activeProfile, hasMultipleProfiles, view, toggleInsights])
  useMobilePageActions(pageActions)

  const moveMonth = (direction: -1|1) => {
    const next = direction === 1 ? addMonths(month, 1) : subMonths(month, 1)
    setMonth(next)
    setSelected(startOfMonth(next))
  }

  return <section className="training-page">
    {profileDrawerOpen && <TrainingProfileDrawer
      profiles={profiles.data ?? []}
      activeProfileId={activeProfile?.id ?? ''}
      onClose={() => setProfileDrawerOpen(false)}
    />}

    {view === 'calendar' && <section className="training-calendar-section">
      <div className="training-calendar-content">
        <div className="calendar-toolbar">
          <button className="toolbar-icon" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft /></button>
          <h2>{format(month, 'MMMM yyyy')}</h2>
          <button className="toolbar-icon" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight /></button>
        </div>
        <div className="training-calendar" aria-label={`${format(month, 'MMMM yyyy')} training calendar`}>
          <div className="weekday-row" aria-hidden="true">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="month-grid">
            {days.map((day) => {
              const daySessions = byDay.get(isoDate(day)) ?? []
              const actual = daySessions.reduce((total, session) => total + session.actualDurationSeconds, 0)
              const state = trainingDayState(daySessions, today)
              return <button
                key={isoDate(day)}
                className={`calendar-day ${state} ${isSameMonth(day, month) ? '' : 'outside'} ${isSameDay(day, selected) ? 'selected' : ''}`}
                aria-label={`${format(day, 'EEEE d MMMM')}${daySessions.length ? `, ${daySessions.length} sessions, ${trainingDayStateLabel(state)}, ${minutes(actual)}` : ', no training'}`}
                aria-pressed={isSameDay(day, selected)}
                onClick={() => setSelected(day)}
              >
                <span className="day-number">{format(day, 'd')}</span>
                {daySessions.length > 0 && <span className="day-state">{trainingDayStateLabel(state)}</span>}
                {actual > 0 && <strong>{minutes(actual)}</strong>}
              </button>
            })}
          </div>
        </div>

        <section className="selected-day-card" aria-labelledby="selected-day-title">
          <div className="selected-day-summary">
            <div><span className="eyebrow">{isSameDay(selected, new Date()) ? 'Today' : format(selected, 'EEEE')}</span><h2 id="selected-day-title">{format(selected, 'd MMMM')}</h2></div>
            <div className="selected-day-actions">
              <button className="button secondary" onClick={() => navigate(`/training/new?date=${isoDate(selected)}&mode=quick`)}><Zap size={17} /> Quick start</button>
              {selected <= new Date() && <button className="button secondary" onClick={() => navigate(`/training/new?date=${isoDate(selected)}&mode=manual`)}><Clock3 size={17} /> Log</button>}
            </div>
          </div>

          {sessions.isLoading && <div className="library-skeleton">Loading training for this day…</div>}
          {sessions.isError && <div className="notice">We could not load this month. Check your connection and try again.</div>}
          {!sessions.isLoading && selectedSessions.length === 0 && <div className="selected-day-empty">
            <span><CalendarDays size={21} /></span>
            <div><strong>No training planned</strong><p>Add a focused plan now, or use Log after practice.</p></div>
            <button className="button" onClick={() => navigate(`/training/new?date=${isoDate(selected)}&mode=planned`)}>Plan this day</button>
          </div>}

          {selectedSessions.length > 0 && <div className="day-session-list">
            {selectedSessions.map((session) => <button key={session.id} className="session-row" onClick={() => navigate(session.status === 'in_progress' ? `/training/${session.id}/run` : `/training/${session.id}`)}>
              <span className={`session-symbol ${isMissedTrainingSession(session, today) ? 'missed' : session.status}`}><Clock3 size={19} /></span>
              <span className="session-copy"><strong>{session.title}</strong><small>{session.skillNames.join(' · ') || 'Training session'}</small></span>
              <span className="session-meta"><strong>{session.actualDurationSeconds ? minutes(session.actualDurationSeconds) : minutes(session.plannedDurationSeconds)}</strong><small>{session.entryMode === 'manual' ? 'Manual log' : isMissedTrainingSession(session, today) ? 'Missed' : statusLabel[session.status]}</small></span>
              <ChevronRight size={18} />
            </button>)}
          </div>}
        </section>
      </div>
    </section>}

    {view === 'insights' && <TrainingInsights month={month} />}
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
  return <section className="insights-view">
    <div className="insight-range" aria-label="Insight range">
      <button className={range === 'week' ? 'active' : ''} onClick={() => setRange('week')}>Last 7 days</button>
      <button className={range === 'month' ? 'active' : ''} onClick={() => setRange('month')}>This month</button>
    </div>
    {insights.isLoading && <div className="library-skeleton">Calculating the training summary…</div>}
    {insights.isError && <div className="notice">We could not calculate insights right now.</div>}
    {data && <>
      <dl className="training-summary">
        <div><dt>Training days</dt><dd>{data.trainingDays}</dd></div>
        <div><dt>Active time</dt><dd>{minutes(data.actualDurationSeconds)}</dd></div>
        <div><dt>Plans completed</dt><dd>{data.plannedSessions ? `${planRate}%` : 'No plans'}</dd></div>
        <div><dt>Plan vs actual</dt><dd>{minutes(data.plannedDurationSeconds)} / {minutes(data.actualDurationSeconds)}</dd></div>
      </dl>
      <div className="skill-time-section">
        <div><span className="eyebrow">{data.profile ? `${data.profile.displayName}'s practice` : 'Where time went'}</span><h2>Skills trained</h2></div>
        {data.skills.length === 0 ? <div className="training-empty"><BarChart3 size={28} /><strong>No practice data yet</strong><span>Complete a timed session or add a manual log to build this view.</span></div> :
          <div className="skill-time-list">{data.skills.map((skill) => <div className="skill-time-row" key={skill.skillId}>
            <div><strong>{skill.skillName}</strong><small>{minutes(skill.actualDurationSeconds)} actual · {minutes(skill.plannedDurationSeconds)} planned</small></div>
            <div className="time-bar" aria-label={`${skill.skillName}, ${minutes(skill.actualDurationSeconds)}`}><span style={{ width: `${Math.max(4, skill.actualDurationSeconds / maxSkillTime * 100)}%` }} /></div>
            <span className="confidence-mark">{skill.latestConfidenceRating ? `${skill.latestConfidenceRating}/5` : 'No check-in'}{skill.latestConfidenceRating && skill.previousConfidenceRating ? <small>{skill.latestConfidenceRating > skill.previousConfidenceRating ? 'Improving' : skill.latestConfidenceRating < skill.previousConfidenceRating ? 'Lower today' : 'Steady'}</small> : null}</span>
          </div>)}</div>}
      </div>
    </>}
  </section>
}
