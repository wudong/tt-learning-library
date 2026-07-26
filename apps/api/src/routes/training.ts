import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import {
  CompleteTrainingSessionRequestSchema,
  CopyTrainingSessionRequestSchema,
  CreateTrainingProfileRequestSchema,
  CreateTrainingSessionRequestSchema,
  ReplaceRemainingBlocksRequestSchema,
  TrainingBlockTransitionRequestSchema,
  TrainingRangeQuerySchema,
  UpdateTrainingProfileRequestSchema,
  UpdateTrainingSessionRequestSchema,
} from '@ttll/shared'
import { getPrincipal } from '../auth/principal'
import { ProfiledTrainingService } from '../services/profiledTrainingService'

const MAX_SESSION_QUERY_DAYS = 366
const SERVICE_WINDOW_DAYS = 61

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00Z`)
}

function localDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function plusDays(value: string, days: number) {
  const date = parseLocalDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return localDate(date)
}

async function listSessionRange(
  service: ProfiledTrainingService,
  userId: string,
  from: string,
  to: string,
  profileId?: string,
) {
  const start = parseLocalDate(from)
  const end = parseLocalDate(to)
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000)
  if (!Number.isFinite(totalDays) || totalDays < 0) throw new Error('VALIDATION_ERROR: Invalid date range')
  if (totalDays >= MAX_SESSION_QUERY_DAYS) throw new Error(`VALIDATION_ERROR: Date range cannot exceed ${MAX_SESSION_QUERY_DAYS} days`)

  const sessions = []
  let cursor = from
  while (cursor <= to) {
    const candidateEnd = plusDays(cursor, SERVICE_WINDOW_DAYS)
    const windowEnd = candidateEnd < to ? candidateEnd : to
    sessions.push(...await service.listSessions(userId, cursor, windowEnd, profileId))
    cursor = plusDays(windowEnd, 1)
  }
  return sessions.sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate) || left.createdAt.localeCompare(right.createdAt))
}

export function trainingRoutes(db: Kysely<Database>) {
  const app = new Hono()

  app.get('/profiles', async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).listProfiles(getPrincipal(c).userId) })
  })

  app.post('/profiles', zValidator('json', CreateTrainingProfileRequestSchema), async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).createProfile(getPrincipal(c).userId, c.req.valid('json')) }, 201)
  })

  app.patch('/profiles/:id', zValidator('json', UpdateTrainingProfileRequestSchema), async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).updateProfile(getPrincipal(c).userId, c.req.param('id'), c.req.valid('json')) })
  })

  app.delete('/profiles/:id', async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).deleteProfile(getPrincipal(c).userId, c.req.param('id')) })
  })

  app.get('/insights', zValidator('query', TrainingRangeQuerySchema), async (c) => {
    const query = c.req.valid('query')
    return c.json({ data: await new ProfiledTrainingService(db).getInsights(getPrincipal(c).userId, query.from, query.to, query.profileId) })
  })

  app.get('/practice-options/:skillId', async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).getPracticeOptions(getPrincipal(c).userId, c.req.param('skillId')) })
  })

  app.get('/sessions', zValidator('query', TrainingRangeQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const service = new ProfiledTrainingService(db)
    return c.json({ data: await listSessionRange(service, getPrincipal(c).userId, query.from, query.to, query.profileId) })
  })

  app.post('/sessions', zValidator('json', CreateTrainingSessionRequestSchema), async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).createSession(getPrincipal(c).userId, c.req.valid('json')) }, 201)
  })

  app.get('/sessions/:id', async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).getSession(getPrincipal(c).userId, c.req.param('id')) })
  })

  app.patch('/sessions/:id', zValidator('json', UpdateTrainingSessionRequestSchema), async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).updateSession(getPrincipal(c).userId, c.req.param('id'), c.req.valid('json')) })
  })

  app.delete('/sessions/:id', async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).deleteSession(getPrincipal(c).userId, c.req.param('id')) })
  })

  app.post('/sessions/:id/copy', zValidator('json', CopyTrainingSessionRequestSchema), async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).copySession(getPrincipal(c).userId, c.req.param('id'), c.req.valid('json')) }, 201)
  })

  app.put('/sessions/:id/remaining-blocks', zValidator('json', ReplaceRemainingBlocksRequestSchema), async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).replaceRemainingBlocks(getPrincipal(c).userId, c.req.param('id'), c.req.valid('json')) })
  })

  app.post('/sessions/:id/start', async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).startSession(getPrincipal(c).userId, c.req.param('id')) })
  })

  app.post('/sessions/:id/blocks/:blockId/transition', zValidator('json', TrainingBlockTransitionRequestSchema), async (c) => {
    const input = c.req.valid('json')
    return c.json({ data: await new ProfiledTrainingService(db).transitionBlock(getPrincipal(c).userId, c.req.param('id'), c.req.param('blockId'), input.action, input.additionalSeconds) })
  })

  app.post('/sessions/:id/complete', zValidator('json', CompleteTrainingSessionRequestSchema), async (c) => {
    return c.json({ data: await new ProfiledTrainingService(db).completeSession(getPrincipal(c).userId, c.req.param('id'), c.req.valid('json')) })
  })

  return app
}
