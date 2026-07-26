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
    return c.json({ data: await new ProfiledTrainingService(db).listSessions(getPrincipal(c).userId, query.from, query.to, query.profileId) })
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
