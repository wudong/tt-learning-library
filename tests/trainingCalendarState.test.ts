import { expect, test } from 'bun:test'
import { isMissedTrainingSession, trainingDayState, trainingDayStateLabel } from '../apps/web/src/features/training/calendarState'

test('past uncompleted plans are visibly classified as missed', () => {
  const missed = { scheduledDate: '2026-07-20', status: 'planned' }
  expect(isMissedTrainingSession(missed, '2026-07-26')).toBe(true)
  expect(trainingDayState([missed], '2026-07-26')).toBe('missed')
  expect(trainingDayStateLabel('missed')).toBe('Missed')
})

test('completed and mixed days remain distinguishable', () => {
  const completed = { scheduledDate: '2026-07-20', status: 'completed' }
  const missed = { scheduledDate: '2026-07-20', status: 'planned' }
  expect(trainingDayState([completed], '2026-07-26')).toBe('trained')
  expect(trainingDayState([completed, missed], '2026-07-26')).toBe('partial')
  expect(trainingDayState([{ scheduledDate: '2026-07-27', status: 'planned' }], '2026-07-26')).toBe('planned')
})
