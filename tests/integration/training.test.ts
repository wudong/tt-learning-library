import { expect, test } from 'bun:test'
import { createMigratedTestDb, provisionOntology } from '../../packages/db/src'
import { TrainingService } from '../../apps/api/src/services/trainingService'
import { VideoAggregateService } from '../../apps/api/src/services/videoAggregateService'
import { LibraryAggregateService } from '../../apps/api/src/services/libraryAggregateService'

async function setup(userId: string) {
  const ctx = await createMigratedTestDb()
  const now = new Date().toISOString()
  await ctx.db.insertInto('users').values({ id: userId, email: null, display_name: 'Training player', created_at: now, updated_at: now, deleted_at: null }).execute()
  await provisionOntology(ctx.db, userId)
  const skill = await ctx.db.selectFrom('skills').selectAll().where('user_id', '=', userId).where('name', '=', 'Backspin Serve').executeTakeFirstOrThrow()
  const video = await new VideoAggregateService(ctx.db).createVideo(userId, {
    sourceUrl: 'https://youtu.be/training123',
    title: 'Backspin serve reference',
    topicIds: [],
    skillIds: [skill.id],
    tagIds: [],
    progress: 'watched',
    learningState: 'practicing',
  })
  const drill = await new LibraryAggregateService(ctx.db).createDrill(userId, {
    title: 'Five baskets of short serves',
    skillNodeId: skill.node_id,
    videoNodeId: video.node.id,
  })
  return { ...ctx, skill, video: video.video, drill }
}

test('training plan creates private graph, domain, ordered blocks, and mirrors atomically', async () => {
  const { db, skill, video, drill } = await setup('user_training_create')
  try {
    const service = new TrainingService(db)
    const created = await service.createSession('user_training_create', {
      scheduledDate: '2026-07-24',
      timeZone: 'Europe/London',
      title: 'Serve practice',
      entryMode: 'planned',
      blocks: [{ skillId: skill.id, drillId: drill.id, videoId: video.id, plannedDurationSeconds: 900, focusNote: 'Second bounce near the line' }],
    })
    expect(created.session.status).toBe('planned')
    expect(created.session.plannedDurationSeconds).toBe(900)
    expect(created.blocks[0]?.skill.title).toBe('Backspin Serve')
    expect(created.blocks[0]?.drill?.title).toBe('Five baskets of short serves')
    const node = await db.selectFrom('graph_nodes').selectAll().where('id', '=', created.session.nodeId).executeTakeFirstOrThrow()
    expect(node.node_type).toBe('practice_session')
    expect(node.visibility).toBe('private')
    const edges = await db.selectFrom('graph_edges').selectAll().where('source_node_id', '=', node.id).where('deleted_at', 'is', null).execute()
    expect(edges.map((edge) => edge.edge_type).sort()).toEqual(['contains', 'contains', 'practices'])
  } finally { await db.destroy() }
})

test('invalid or cross-owner training attachments roll back the session node', async () => {
  const { db, skill } = await setup('user_training_atomic')
  try {
    const now = new Date().toISOString()
    await db.insertInto('users').values({ id: 'user_training_other', email: null, display_name: 'Other', created_at: now, updated_at: now, deleted_at: null }).execute()
    await provisionOntology(db, 'user_training_other')
    const otherSkill = await db.selectFrom('skills').selectAll().where('user_id', '=', 'user_training_other').where('name', '=', 'Backspin Serve').executeTakeFirstOrThrow()
    const otherVideo = await new VideoAggregateService(db).createVideo('user_training_other', {
      sourceUrl: 'https://youtu.be/othertraining',
      topicIds: [],
      skillIds: [otherSkill.id],
      tagIds: [],
      progress: 'saved',
      learningState: 'none',
    })
    const before = Number((await db.selectFrom('practice_sessions').select((eb) => eb.fn.countAll().as('count')).executeTakeFirstOrThrow()).count)
    await expect(new TrainingService(db).createSession('user_training_atomic', {
      scheduledDate: '2026-07-24',
      timeZone: 'Europe/London',
      entryMode: 'planned',
      blocks: [{ skillId: skill.id, videoId: otherVideo.video.id, plannedDurationSeconds: 600 }],
    })).rejects.toThrow('Video is not linked')
    const after = Number((await db.selectFrom('practice_sessions').select((eb) => eb.fn.countAll().as('count')).executeTakeFirstOrThrow()).count)
    const orphan = await db.selectFrom('graph_nodes').select('id').where('user_id', '=', 'user_training_atomic').where('node_type', '=', 'practice_session').executeTakeFirst()
    expect(after).toBe(before)
    expect(orphan).toBeUndefined()
  } finally { await db.destroy() }
})

test('timer transitions persist elapsed time, enforce one active block, and feed private insights', async () => {
  const { db, skill } = await setup('user_training_timer')
  try {
    const secondSkill = await db.selectFrom('skills').selectAll().where('user_id', '=', 'user_training_timer').where('name', '=', 'Forehand Drive').executeTakeFirstOrThrow()
    const service = new TrainingService(db)
    const created = await service.createSession('user_training_timer', {
      scheduledDate: '2026-07-23',
      timeZone: 'Europe/London',
      entryMode: 'planned',
      blocks: [
        { skillId: skill.id, plannedDurationSeconds: 600 },
        { skillId: secondSkill.id, plannedDurationSeconds: 900 },
      ],
    })
    const first = created.blocks[0]!
    const second = created.blocks[1]!
    await service.startSession('user_training_timer', created.session.id)
    await service.transitionBlock('user_training_timer', created.session.id, first.id, 'start')
    await expect(service.transitionBlock('user_training_timer', created.session.id, second.id, 'start')).rejects.toThrow('active block')
    await db.updateTable('practice_session_blocks').set({ timer_started_at: new Date(Date.now() - 2100).toISOString() }).where('id', '=', first.id).execute()
    const paused = await service.transitionBlock('user_training_timer', created.session.id, first.id, 'pause')
    expect(paused.blocks[0]!.actualDurationSeconds).toBeGreaterThanOrEqual(2)
    await service.transitionBlock('user_training_timer', created.session.id, first.id, 'resume')
    await service.transitionBlock('user_training_timer', created.session.id, first.id, 'complete')
    const completed = await service.completeSession('user_training_timer', created.session.id, {
      overallRating: 4,
      reflection: 'Serve stayed lower',
      checkins: [{ skillId: skill.id, confidenceRating: 3 }],
    })
    expect(completed.session.status).toBe('completed')
    expect(completed.blocks[1]!.status).toBe('skipped')
    expect(completed.checkins).toEqual([{ skillId: skill.id, confidenceRating: 3, note: null }])
    const insights = await service.getInsights('user_training_timer', '2026-07-01', '2026-07-31')
    expect(insights.trainingDays).toBe(1)
    expect(insights.completedPlannedSessions).toBe(1)
    expect(insights.skills.find((row) => row.skillId === skill.id)?.latestConfidenceRating).toBe(3)
    expect((await service.listSessions('user_training_timer', '2026-07-01', '2026-07-31'))).toHaveLength(1)
    expect((await service.listSessions('user_missing', '2026-07-01', '2026-07-31'))).toEqual([])
  } finally { await db.destroy() }
})

test('manual logs preserve actual time without inflating planned-session completion', async () => {
  const { db, skill } = await setup('user_training_manual')
  try {
    const service = new TrainingService(db)
    const manual = await service.createSession('user_training_manual', {
      scheduledDate: '2026-07-22',
      timeZone: 'Europe/London',
      entryMode: 'manual',
      blocks: [{ skillId: skill.id, actualDurationSeconds: 1200, plannedDurationSeconds: null }],
      overallRating: 5,
      checkins: [{ skillId: skill.id, confidenceRating: 4 }],
    })
    expect(manual.session.status).toBe('completed')
    expect(manual.session.actualDurationSeconds).toBe(1200)
    const insights = await service.getInsights('user_training_manual', '2026-07-01', '2026-07-31')
    expect(insights.actualDurationSeconds).toBe(1200)
    expect(insights.plannedSessions).toBe(0)
    expect(insights.completedPlannedSessions).toBe(0)
  } finally { await db.destroy() }
})
