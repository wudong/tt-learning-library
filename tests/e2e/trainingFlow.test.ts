import { expect, test } from 'bun:test'
import { Hono } from 'hono'
import { createMigratedTestDb, provisionOntology } from '../../packages/db/src'
import { trainingRoutes } from '../../apps/api/src/routes/training'

test('plan to timer to reflection appears in calendar and insights', async () => {
  const { db } = await createMigratedTestDb()
  const userId = 'user_training_e2e'
  try {
    const now = new Date().toISOString()
    await db.insertInto('users').values({ id: userId, email: null, display_name: 'E2E player', created_at: now, updated_at: now, deleted_at: null }).execute()
    await provisionOntology(db, userId)
    const skill = await db.selectFrom('skills').selectAll().where('user_id', '=', userId).where('name', '=', 'Forehand Drive').executeTakeFirstOrThrow()

    const app = new Hono()
    app.use('/api/*', async (c, next) => {
      c.set('principal', { userId, email: null, mode: 'local' })
      await next()
    })
    app.route('/api/training', trainingRoutes(db))

    const createdResponse = await app.request('/api/training/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scheduledDate: '2026-07-23',
        timeZone: 'Europe/London',
        title: 'Forehand focus',
        entryMode: 'planned',
        blocks: [{ skillId: skill.id, plannedDurationSeconds: 600, focusNote: 'Recover to ready position' }],
      }),
    })
    expect(createdResponse.status).toBe(201)
    const created = (await createdResponse.json() as { data: { session: { id: string }; blocks: Array<{ id: string }> } }).data
    const sessionId = created.session.id
    const blockId = created.blocks[0]!.id

    expect((await app.request(`/api/training/sessions/${sessionId}/start`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status).toBe(200)
    expect((await app.request(`/api/training/sessions/${sessionId}/blocks/${blockId}/transition`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start' }),
    })).status).toBe(200)
    expect((await app.request(`/api/training/sessions/${sessionId}/blocks/${blockId}/transition`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'add_time', additionalSeconds: 300 }),
    })).status).toBe(200)
    await db.updateTable('practice_session_blocks').set({ timer_started_at: new Date(Date.now() - 1200).toISOString() }).where('id', '=', blockId).execute()
    expect((await app.request(`/api/training/sessions/${sessionId}/blocks/${blockId}/transition`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'complete' }),
    })).status).toBe(200)
    const completeResponse = await app.request(`/api/training/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ overallRating: 4, reflection: 'Contact improved', checkins: [{ skillId: skill.id, confidenceRating: 3 }] }),
    })
    expect(completeResponse.status).toBe(200)

    const calendar = await app.request('/api/training/sessions?from=2026-07-01&to=2026-07-31')
    const calendarData = (await calendar.json() as { data: Array<{ id: string; status: string }> }).data
    expect(calendarData).toEqual([expect.objectContaining({ id: sessionId, status: 'completed' })])
    const insights = await app.request('/api/training/insights?from=2026-07-01&to=2026-07-31')
    const insightData = (await insights.json() as { data: { trainingDays: number; completedPlannedSessions: number; skills: Array<{ skillName: string; latestConfidenceRating: number }> } }).data
    expect(insightData.trainingDays).toBe(1)
    expect(insightData.completedPlannedSessions).toBe(1)
    expect(insightData.skills[0]).toEqual(expect.objectContaining({ skillName: 'Forehand Drive', latestConfidenceRating: 3 }))
  } finally {
    await db.destroy()
  }
})
