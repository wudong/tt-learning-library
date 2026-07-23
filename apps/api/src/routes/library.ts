import { Hono } from 'hono'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { TopicSkillRepository } from '@ttll/db'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { TABLE_TENNIS_SKILLS, TABLE_TENNIS_TOPICS } from '@ttll/shared'
import { getPrincipal } from '../auth/principal'
import { LibraryAggregateService } from '../services/libraryAggregateService'
import { presentNote, presentSkill, presentTopic } from '../services/presenters'

export function libraryRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.get('/overview', async (c) => {
    const overview = await new LibraryAggregateService(db).getOverview(getPrincipal(c).userId)
    return c.json({ data: { topics: overview.topics.map(presentTopic), skills: overview.skills.map(presentSkill), topicVideoCounts: overview.topicVideoCounts, skillVideoCounts: overview.skillVideoCounts } })
  })
  app.get('/topics', async (c) => c.json({ data: (await new TopicSkillRepository(db).listSystemTopics(getPrincipal(c).userId)).filter((topic) => (TABLE_TENNIS_TOPICS as readonly string[]).includes(topic.name)) }))
  app.get('/skills', async (c) => c.json({ data: (await new TopicSkillRepository(db).listSystemSkills(getPrincipal(c).userId)).filter((skill) => TABLE_TENNIS_SKILLS.some((definition) => definition.name === skill.name)) }))
  app.post('/notes', zValidator('json', z.object({ parentNodeId: z.string(), body: z.string().min(1), noteType: z.string().default('plain'), timestampSeconds: z.number().int().nonnegative().optional() })), async (c) => {
    return c.json({ data: presentNote(await new LibraryAggregateService(db).createNote(getPrincipal(c).userId, c.req.valid('json'))) }, 201)
  })
  app.post('/drills', zValidator('json', z.object({ title: z.string().min(1), description: z.string().optional(), skillNodeId: z.string().optional(), videoNodeId: z.string().optional() })), async (c) => {
    return c.json({ data: await new LibraryAggregateService(db).createDrill(getPrincipal(c).userId, c.req.valid('json')) }, 201)
  })
  return app
}
