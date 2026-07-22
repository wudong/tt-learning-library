import { Hono } from 'hono'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { TopicSkillRepository } from '@ttll/db'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getPrincipal } from '../auth/principal'
import { LibraryAggregateService } from '../services/libraryAggregateService'

export function libraryRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.get('/topics', async (c) => c.json({ data: await new TopicSkillRepository(db).listTopics(getPrincipal(c).userId) }))
  app.post('/topics', zValidator('json', z.object({ name: z.string().min(1), description: z.string().optional() })), async (c) => {
    return c.json({ data: await new LibraryAggregateService(db).createTopic(getPrincipal(c).userId, c.req.valid('json')) }, 201)
  })
  app.get('/skills', async (c) => c.json({ data: await new TopicSkillRepository(db).listSkills(getPrincipal(c).userId) }))
  app.post('/skills', zValidator('json', z.object({ name: z.string().min(1), topicId: z.string().optional(), difficulty: z.string().optional(), status: z.string().optional() })), async (c) => {
    return c.json({ data: await new LibraryAggregateService(db).createSkill(getPrincipal(c).userId, c.req.valid('json')) }, 201)
  })
  app.post('/notes', zValidator('json', z.object({ parentNodeId: z.string(), body: z.string().min(1), noteType: z.string().default('plain'), timestampSeconds: z.number().int().nonnegative().optional() })), async (c) => {
    return c.json({ data: await new LibraryAggregateService(db).createNote(getPrincipal(c).userId, c.req.valid('json')) }, 201)
  })
  app.post('/drills', zValidator('json', z.object({ title: z.string().min(1), description: z.string().optional(), skillNodeId: z.string().optional(), videoNodeId: z.string().optional() })), async (c) => {
    return c.json({ data: await new LibraryAggregateService(db).createDrill(getPrincipal(c).userId, c.req.valid('json')) }, 201)
  })
  return app
}
