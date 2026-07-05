import { Hono } from 'hono'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { GraphRepository, NoteDrillRepository, TopicSkillRepository } from '@ttll/db'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getPrincipal } from '../auth/principal'

export function libraryRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.get('/topics', async (c) => c.json({ data: await new TopicSkillRepository(db).listTopics(getPrincipal(c).userId) }))
  app.post('/topics', zValidator('json', z.object({ name: z.string().min(1), description: z.string().optional() })), async (c) => {
    const userId = getPrincipal(c).userId; const body = c.req.valid('json'); const graph = new GraphRepository(db)
    const node = await graph.createNode({ userId, nodeType: 'topic', title: body.name, summary: body.description ?? null })
    return c.json({ data: await new TopicSkillRepository(db).createTopic({ userId, nodeId: node.id, name: body.name, description: body.description }) }, 201)
  })
  app.get('/skills', async (c) => c.json({ data: await new TopicSkillRepository(db).listSkills(getPrincipal(c).userId) }))
  app.post('/skills', zValidator('json', z.object({ name: z.string().min(1), topicId: z.string().optional(), difficulty: z.string().optional(), status: z.string().optional() })), async (c) => {
    const userId = getPrincipal(c).userId; const body = c.req.valid('json'); const graph = new GraphRepository(db)
    return await db.transaction().execute(async (trx) => {
      const txGraph = new GraphRepository(trx); const node = await txGraph.createNode({ userId, nodeType: 'skill', title: body.name })
      const skill = await new TopicSkillRepository(trx).createSkill({ userId, nodeId: node.id, name: body.name, topicId: body.topicId, difficulty: body.difficulty, status: body.status })
      if (body.topicId) { const topic = await new TopicSkillRepository(trx).getTopic(userId, body.topicId); if (topic) await txGraph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: topic.node_id, edgeType: 'belongs_to' }) }
      return c.json({ data: skill }, 201)
    })
  })
  app.post('/notes', zValidator('json', z.object({ parentNodeId: z.string(), body: z.string().min(1), noteType: z.string().default('plain'), timestampSeconds: z.number().int().nonnegative().optional() })), async (c) => {
    const userId = getPrincipal(c).userId; const body = c.req.valid('json'); const graph = new GraphRepository(db)
    const node = await graph.createNode({ userId, nodeType: 'note', title: body.body.slice(0, 80), summary: body.body })
    const note = await new NoteDrillRepository(db).createNote({ userId, nodeId: node.id, parentNodeId: body.parentNodeId, body: body.body, noteType: body.noteType, timestampSeconds: body.timestampSeconds })
    return c.json({ data: note }, 201)
  })
  app.post('/drills', zValidator('json', z.object({ title: z.string().min(1), description: z.string().optional(), skillNodeId: z.string().optional(), videoNodeId: z.string().optional() })), async (c) => {
    const userId = getPrincipal(c).userId; const body = c.req.valid('json')
    return db.transaction().execute(async (trx) => { const graph = new GraphRepository(trx); const node = await graph.createNode({ userId, nodeType: 'drill', title: body.title, summary: body.description ?? null }); const drill = await new NoteDrillRepository(trx).createDrill({ userId, nodeId: node.id, title: body.title, description: body.description }); if (body.skillNodeId) await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: body.skillNodeId, edgeType: 'drill_for' }); if (body.videoNodeId) await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: body.videoNodeId, edgeType: 'drill_for' }); return c.json({ data: drill }, 201) })
  })
  return app
}
