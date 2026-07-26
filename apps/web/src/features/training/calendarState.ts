export type CalendarSession = {
  scheduledDate: string
  status: string
}

export type TrainingDayState = 'empty' | 'planned' | 'trained' | 'missed' | 'partial'

export function isMissedTrainingSession(session: CalendarSession, today: string): boolean {
  return session.status === 'planned' && session.scheduledDate < today
}

export function trainingDayState(sessions: CalendarSession[], today: string): TrainingDayState {
  const completed = sessions.some((session) => session.status === 'completed')
  const missed = sessions.some((session) => isMissedTrainingSession(session, today))
  if (completed && missed) return 'partial'
  if (missed) return 'missed'
  if (completed) return 'trained'
  if (sessions.some((session) => session.status === 'planned' || session.status === 'in_progress')) return 'planned'
  return 'empty'
}

export function trainingDayStateLabel(state: TrainingDayState): string {
  return { empty: '', planned: 'Plan', trained: 'Done', missed: 'Missed', partial: 'Partial' }[state]
}
