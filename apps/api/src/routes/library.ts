import { Hono } from 'hono'
import type { Kysely } from 'kysely'
import type { Database } from '@ttll/db'
import { TopicSkillRepository } from '@ttll/db'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { TABLE_TENNIS_SKILLS, TABLE_TENNIS_TOPICS } from '@ttll/shared'
import { getPrincipal } from '../auth/principal'
import { LibraryAggregateService } from '../services/libraryAggregateService'
import { presentDrill, presentDrillStep, presentNode, presentNote, presentSkill, presentTopic, presentVideo } from '../services/presenters'

export function libraryRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.get('/overview', async (c) => {
    const overview = await new LibraryAggregateService(db).getOverview(getPrincipal(c).userId)
    return c.json({ data: { topics: overview.topics.map(presentTopic), skills: overview.skills.map(presentSkill), drills: overview.drills.map(presentDrill), topicVideoCounts: overview.topicVideoCounts, skillVideoCounts: overview.skillVideoCounts } })
  })
  app.get('/nodes/:nodeId/resources', async (c) => {
    const result = await new LibraryAggregateService(db).getNodeResources(getPrincipal(c).userId, c.req.param('nodeId'))
    return c.json({ data: { node: presentNode(result.node), videos: result.videos.map(presentVideo), skills: result.skills.map(presentNode), drills: result.drills.map(presentDrill), drill: result.drill ? presentDrill(result.drill) : null, drillSteps: result.drillSteps.map(presentDrillStep), isPinned: result.isPinned } })
  })
  app.patch('/nodes/:nodeId/pin', zValidator('json', z.object({ pinned: z.boolean() })), async (c) => {
    return c.json({ data: await new LibraryAggregateService(db).setPinned(getPrincipal(c).userId, c.req.param('nodeId'), c.req.valid('json').pinned) })
  })
  app.post('/nodes/:nodeId/videos/:videoId', async (c) => {
    const result = await new LibraryAggregateService(db).attachVideo(getPrincipal(c).userId, c.req.param('nodeId'), c.req.param('videoId'))
    return c.json({ data: { edge: result.edge, video: presentVideo(result.video) } }, 201)
  })
  app.post('/nodes/:nodeId/skills/:skillNodeId', async (c) => {
    const edge = await new LibraryAggregateService(db).linkPersonalDrillToSkill(getPrincipal(c).userId, c.req.param('nodeId'), c.req.param('skillNodeId'))
    return c.json({ data: { edge } }, 201)
  })
  app.get('/topics', async (c) => c.json({ data: (await new TopicSkillRepository(db).listSystemTopics(getPrincipal(c).userId)).filter((topic) => (TABLE_TENNIS_TOPICS as readonly string[]).includes(topic.name)) }))
  app.get('/skills', async (c) => c.json({ data: (await new TopicSkillRepository(db).listSystemSkills(getPrincipal(c).userId)).filter((skill) => TABLE_TENNIS_SKILLS.some((definition) => definition.name === skill.name)) }))
  app.patch('/topics/:id/visibility', zValidator('json', z.object({ hidden: z.boolean() })), async (c) => {
    const topic = await new TopicSkillRepository(db).setTopicHidden(getPrincipal(c).userId, c.req.param('id'), c.req.valid('json').hidden)
    return c.json({ data: presentTopic(topic) })
  })
  app.post('/notes', zValidator('json', z.object({ parentNodeId: z.string(), body: z.string().min(1), noteType: z.string().default('plain'), timestampSeconds: z.number().int().nonnegative().optional() })), async (c) => {
    return c.json({ data: presentNote(await new LibraryAggregateService(db).createNote(getPrincipal(c).userId, c.req.valid('json'))) }, 201)
  })
  app.post('/drills', zValidator('json', z.object({ description: z.string().trim().min(1).max(2000) })), async (c) => {
    return c.json({ data: await new LibraryAggregateService(db).createDrillFromDescription(getPrincipal(c).userId, c.req.valid('json').description) }, 201)
  })
  return app
}
