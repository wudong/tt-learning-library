import type { Kysely } from 'kysely'
import {
  GraphRepository,
  TrainingRepository,
  type Database,
  type Row,
} from '@ttll/db'
import type {
  CompleteTrainingSessionRequest,
  CreateTrainingSessionRequest,
  ReplaceRemainingBlocksRequest,
  TrainingSessionDetailDto,
} from '@ttll/shared'

type Conn = Kysely<Database>
type BlockInput = CreateTrainingSessionRequest['blocks'][number]

const elapsedSeconds = (startedAt: string | null, nowMs = Date.now()) =>
  startedAt ? Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000)) : 0

function assertDateRange(from: string, to: string, maxDays: number) {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('VALIDATION_ERROR: Invalid date range')
  if ((end - start) / 86_400_000 > maxDays) throw new Error(`VALIDATION_ERROR: Date range cannot exceed ${maxDays + 1} days`)
}

function assertTimeZone(timeZone: string) {
  try { new Intl.DateTimeFormat('en', { timeZone }).format() } catch { throw new Error('VALIDATION_ERROR: Invalid time zone') }
}

function todayInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts()
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export class TrainingService {
  constructor(private readonly db: Conn) {}

  async createSession(userId: string, input: CreateTrainingSessionRequest) {
    assertTimeZone(input.timeZone)
    if (input.entryMode === 'manual' && input.scheduledDate > todayInTimeZone(input.timeZone)) {
      throw new Error('VALIDATION_ERROR: Manual training cannot be logged in the future')
    }
    return this.db.transaction().execute(async (trx) => {
      await this.validateBlocks(trx, userId, input.blocks)
      this.validateCheckins(input.blocks, input.checkins ?? [])
      const title = input.title?.trim() || `Training • ${input.scheduledDate}`
      const graph = new GraphRepository(trx)
      const node = await graph.createNode({ userId, nodeType: 'practice_session', title, visibility: 'private' })
      const now = new Date().toISOString()
      const manual = input.entryMode === 'manual'
      const repository = new TrainingRepository(trx)
      const session = await repository.createSession({
        node_id: node.id,
        user_id: userId,
        scheduled_date: input.scheduledDate,
        time_zone: input.timeZone,
        title,
        status: manual ? 'completed' : 'planned',
        entry_mode: input.entryMode,
        overall_rating: input.overallRating ?? null,
        reflection: input.reflection ?? null,
        started_at: manual ? now : null,
        completed_at: manual ? now : null,
      })
      for (const [position, block] of input.blocks.entries()) {
        const planned = manual ? block.plannedDurationSeconds ?? null : block.plannedDurationSeconds!
        await repository.createBlock({
          session_id: session.id,
          user_id: userId,
          skill_id: block.skillId,
          drill_id: block.drillId ?? null,
          video_id: block.videoId ?? null,
          position,
          original_position: position,
          planned_duration_seconds: planned,
          original_planned_duration_seconds: planned,
          actual_duration_seconds: manual ? block.actualDurationSeconds ?? 0 : 0,
          timer_started_at: null,
          status: manual ? 'completed' : 'planned',
          focus_note: block.focusNote ?? null,
          started_at: manual ? now : null,
          completed_at: manual ? now : null,
        })
      }
      if (input.checkins?.length) await repository.replaceCheckins(userId, session.id, input.checkins)
      await this.refreshMirrors(trx, userId, session.id, node.id)
      return this.getSession(userId, session.id, trx)
    })
  }

  async getSession(userId: string, sessionId: string, conn: Conn = this.db): Promise<TrainingSessionDetailDto> {
    const repository = new TrainingRepository(conn)
    const session = await repository.getSession(userId, sessionId)
    if (!session) throw new Error('NOT_FOUND: Training session not found')
    const [blocks, checkins] = await Promise.all([repository.listBlocks(userId, sessionId), repository.listCheckins(userId, sessionId)])
    const references = await repository.getReferences(userId, blocks)
    return this.presentDetail(session, blocks, checkins, references)
  }

  async listSessions(userId: string, from: string, to: string) {
    assertDateRange(from, to, 61)
    const repository = new TrainingRepository(this.db)
    const sessions = await repository.listSessions(userId, from, to)
    const blocks = await repository.listBlocksForSessions(userId, sessions.map((session) => session.id))
    const references = await repository.getReferences(userId, blocks)
    const skills = new Map(references.skills.map((skill) => [skill.id, skill]))
    const blocksBySession = new Map<string, Row<'practice_session_blocks'>[]>()
    for (const block of blocks) blocksBySession.set(block.session_id, [...(blocksBySession.get(block.session_id) ?? []), block])
    return sessions.map((session) => {
      const sessionBlocks = blocksBySession.get(session.id) ?? []
      const detail = this.presentDetail(session, sessionBlocks, [], references)
      return {
        ...detail.session,
        skillNames: [...new Set(sessionBlocks.map((block) => skills.get(block.skill_id)?.name).filter((name): name is string => !!name))],
        blockCount: sessionBlocks.length,
      }
    })
  }

  async updateSession(userId: string, sessionId: string, patch: { scheduledDate?: string; timeZone?: string; title?: string }) {
    if (patch.timeZone) assertTimeZone(patch.timeZone)
    return this.db.transaction().execute(async (trx) => {
      const repository = new TrainingRepository(trx)
      const session = await repository.getSession(userId, sessionId, true)
      if (!session) throw new Error('NOT_FOUND: Training session not found')
      if (session.status !== 'planned' && (patch.scheduledDate || patch.timeZone)) throw new Error('CONFLICT: Only a planned session can be rescheduled')
      const title = patch.title ?? session.title
      await repository.updateSession(userId, sessionId, {
        scheduled_date: patch.scheduledDate ?? session.scheduled_date,
        time_zone: patch.timeZone ?? session.time_zone,
        title,
      })
      if (patch.title) await new GraphRepository(trx).updateNode(userId, session.node_id, { title })
      return this.getSession(userId, sessionId, trx)
    })
  }

  async copySession(userId: string, sessionId: string, input: { scheduledDate: string; timeZone: string; title?: string }) {
    assertTimeZone(input.timeZone)
    const source = await this.getSession(userId, sessionId)
    return this.createSession(userId, {
      scheduledDate: input.scheduledDate,
      timeZone: input.timeZone,
      title: input.title ?? source.session.title,
      entryMode: 'planned',
      blocks: source.blocks.map((block) => ({
        skillId: block.skillId,
        drillId: block.drillId,
        videoId: block.videoId,
        plannedDurationSeconds: block.plannedDurationSeconds ?? Math.max(60, block.actualDurationSeconds),
        focusNote: block.focusNote,
      })),
    })
  }

  async replaceRemainingBlocks(userId: string, sessionId: string, input: ReplaceRemainingBlocksRequest) {
    return this.db.transaction().execute(async (trx) => {
      const repository = new TrainingRepository(trx)
      const session = await repository.getSession(userId, sessionId, true)
      if (!session) throw new Error('NOT_FOUND: Training session not found')
      if (['completed', 'cancelled'].includes(session.status)) throw new Error('CONFLICT: This session can no longer be changed')
      await this.validateBlocks(trx, userId, input.blocks)
      const existing = await repository.listBlocks(userId, sessionId)
      const replaceable = existing.filter((block) => session.status === 'planned' || block.status === 'planned')
      const replaceableById = new Map(replaceable.map((block) => [block.id, block]))
      const locked = existing.filter((block) => !replaceableById.has(block.id))
      const retained = new Set<string>()
      for (const [index, block] of input.blocks.entries()) {
        const position = locked.length + index
        const current = block.id ? replaceableById.get(block.id) : undefined
        if (block.id && !current) throw new Error('VALIDATION_ERROR: A remaining block does not belong to this session')
        if (current) {
          retained.add(current.id)
          await repository.updateBlock(userId, sessionId, current.id, {
            skill_id: block.skillId,
            drill_id: block.drillId ?? null,
            video_id: block.videoId ?? null,
            position,
            original_position: session.status === 'planned' ? position : current.original_position,
            planned_duration_seconds: block.plannedDurationSeconds,
            original_planned_duration_seconds: session.status === 'planned' ? block.plannedDurationSeconds : current.original_planned_duration_seconds,
            focus_note: block.focusNote ?? null,
          })
        } else {
          await repository.createBlock({
            session_id: sessionId,
            user_id: userId,
            skill_id: block.skillId,
            drill_id: block.drillId ?? null,
            video_id: block.videoId ?? null,
            position,
            original_position: session.status === 'planned' ? position : null,
            planned_duration_seconds: block.plannedDurationSeconds,
            original_planned_duration_seconds: session.status === 'planned' ? block.plannedDurationSeconds : null,
            actual_duration_seconds: 0,
            timer_started_at: null,
            status: 'planned',
            focus_note: block.focusNote ?? null,
            started_at: null,
            completed_at: null,
          })
        }
      }
      await repository.softDeleteBlocks(userId, sessionId, replaceable.filter((block) => !retained.has(block.id)).map((block) => block.id))
      await this.refreshMirrors(trx, userId, sessionId, session.node_id)
      return this.getSession(userId, sessionId, trx)
    })
  }

  async startSession(userId: string, sessionId: string) {
    return this.db.transaction().execute(async (trx) => {
      const repository = new TrainingRepository(trx)
      const session = await repository.getSession(userId, sessionId, true)
      if (!session) throw new Error('NOT_FOUND: Training session not found')
      if (session.status === 'completed' || session.status === 'cancelled') throw new Error('CONFLICT: This session cannot be started')
      if (session.status === 'planned') await repository.updateSession(userId, sessionId, { status: 'in_progress', started_at: new Date().toISOString() })
      return this.getSession(userId, sessionId, trx)
    })
  }

  async transitionBlock(userId: string, sessionId: string, blockId: string, action: 'start'|'pause'|'resume'|'complete'|'skip'|'add_time', additionalSeconds?: number) {
    return this.db.transaction().execute(async (trx) => {
      const repository = new TrainingRepository(trx)
      const session = await repository.getSession(userId, sessionId, true)
      if (!session) throw new Error('NOT_FOUND: Training session not found')
      if (session.status === 'completed' || session.status === 'cancelled') throw new Error('CONFLICT: This session is closed')
      const block = await repository.getBlock(userId, sessionId, blockId, true)
      if (!block) throw new Error('NOT_FOUND: Training block not found')
      const running = await repository.getRunningBlock(userId, sessionId)
      const now = new Date().toISOString()
      const accumulated = block.actual_duration_seconds + elapsedSeconds(block.timer_started_at, Date.parse(now))

      if (action === 'start') {
        if (block.status === 'active') return this.getSession(userId, sessionId, trx)
        if (block.status !== 'planned') throw new Error('CONFLICT: Only a planned block can be started')
        if (running && running.id !== block.id) throw new Error('CONFLICT: Pause or finish the active block first')
        await repository.updateBlock(userId, sessionId, blockId, { status: 'active', timer_started_at: now, started_at: block.started_at ?? now })
        if (session.status === 'planned') await repository.updateSession(userId, sessionId, { status: 'in_progress', started_at: session.started_at ?? now })
      }
      if (action === 'resume') {
        if (block.status === 'active') return this.getSession(userId, sessionId, trx)
        if (block.status !== 'paused') throw new Error('CONFLICT: Only a paused block can be resumed')
        if (running && running.id !== block.id) throw new Error('CONFLICT: Pause or finish the active block first')
        await repository.updateBlock(userId, sessionId, blockId, { status: 'active', timer_started_at: now })
      }
      if (action === 'pause') {
        if (block.status === 'paused') return this.getSession(userId, sessionId, trx)
        if (block.status !== 'active') throw new Error('CONFLICT: Only an active block can be paused')
        await repository.updateBlock(userId, sessionId, blockId, { status: 'paused', actual_duration_seconds: accumulated, timer_started_at: null })
      }
      if (action === 'complete') {
        if (block.status === 'completed') return this.getSession(userId, sessionId, trx)
        if (!['planned', 'active', 'paused'].includes(block.status)) throw new Error('CONFLICT: This block cannot be completed')
        await repository.updateBlock(userId, sessionId, blockId, { status: 'completed', actual_duration_seconds: accumulated, timer_started_at: null, completed_at: now })
      }
      if (action === 'skip') {
        if (block.status === 'skipped') return this.getSession(userId, sessionId, trx)
        if (block.status === 'completed') throw new Error('CONFLICT: A completed block cannot be skipped')
        await repository.updateBlock(userId, sessionId, blockId, { status: 'skipped', actual_duration_seconds: accumulated, timer_started_at: null, completed_at: now })
      }
      if (action === 'add_time') {
        if (!additionalSeconds || !block.planned_duration_seconds) throw new Error('VALIDATION_ERROR: This block has no target time to extend')
        if (!['active', 'paused'].includes(block.status)) throw new Error('CONFLICT: Only the current block can be extended')
        await repository.updateBlock(userId, sessionId, blockId, { planned_duration_seconds: block.planned_duration_seconds + additionalSeconds })
      }
      return this.getSession(userId, sessionId, trx)
    })
  }

  async completeSession(userId: string, sessionId: string, input: CompleteTrainingSessionRequest) {
    return this.db.transaction().execute(async (trx) => {
      const repository = new TrainingRepository(trx)
      const session = await repository.getSession(userId, sessionId, true)
      if (!session) throw new Error('NOT_FOUND: Training session not found')
      if (session.status === 'cancelled') throw new Error('CONFLICT: A cancelled session cannot be completed')
      const blocks = await repository.listBlocks(userId, sessionId)
      this.validateCheckins(blocks.map((block) => ({ skillId: block.skill_id } as BlockInput)), input.checkins)
      const now = new Date().toISOString()
      if (session.status !== 'completed') {
        for (const block of blocks) {
          if (block.status === 'active') {
            await repository.updateBlock(userId, sessionId, block.id, {
              status: 'completed',
              actual_duration_seconds: block.actual_duration_seconds + elapsedSeconds(block.timer_started_at, Date.parse(now)),
              timer_started_at: null,
              completed_at: now,
            })
          } else if (block.status === 'planned' || block.status === 'paused') {
            await repository.updateBlock(userId, sessionId, block.id, { status: 'skipped', timer_started_at: null, completed_at: now })
          }
        }
      }
      await repository.replaceCheckins(userId, sessionId, input.checkins)
      await repository.updateSession(userId, sessionId, {
        status: 'completed',
        started_at: session.started_at ?? now,
        completed_at: session.completed_at ?? now,
        overall_rating: input.overallRating ?? null,
        reflection: input.reflection ?? null,
      })
      return this.getSession(userId, sessionId, trx)
    })
  }

  async deleteSession(userId: string, sessionId: string) {
    return this.db.transaction().execute(async (trx) => {
      const repository = new TrainingRepository(trx)
      const session = await repository.softDeleteSession(userId, sessionId)
      await new GraphRepository(trx).softDeleteNode(userId, session.node_id)
      return { deleted: true as const }
    })
  }

  async getPracticeOptions(userId: string, skillId: string) {
    const result = await new TrainingRepository(this.db).getPracticeOptions(userId, skillId)
    if (!result) throw new Error('NOT_FOUND: Skill not found')
    return {
      skill: { id: result.skill.id, nodeId: result.skill.node_id, title: result.skill.name, subtitle: result.skill.description, thumbnailUrl: null, sourceUrl: null },
      drills: result.drills.map((drill) => ({ id: drill.id, nodeId: drill.node_id, title: drill.title, subtitle: drill.description, thumbnailUrl: null, sourceUrl: null })),
      videos: result.videos.map((video) => ({ id: video.id, nodeId: video.node_id, title: video.title ?? video.source_url, subtitle: video.creator_name, thumbnailUrl: video.thumbnail_url, sourceUrl: video.source_url })),
    }
  }

  async getInsights(userId: string, from: string, to: string) {
    assertDateRange(from, to, 365)
    const repository = new TrainingRepository(this.db)
    const sessions = (await repository.listSessions(userId, from, to)).filter((session) => session.status !== 'cancelled')
    const blocks = await repository.listBlocksForSessions(userId, sessions.map((session) => session.id))
    const checkins = await repository.listCheckinsForSessions(userId, sessions.map((session) => session.id))
    const references = await repository.getReferences(userId, blocks)
    const skills = new Map(references.skills.map((skill) => [skill.id, skill]))
    const sessionById = new Map(sessions.map((session) => [session.id, session]))
    const actualFor = (block: Row<'practice_session_blocks'>) => block.actual_duration_seconds + (block.status === 'active' ? elapsedSeconds(block.timer_started_at) : 0)
    const actualDurationSeconds = blocks.reduce((total, block) => total + actualFor(block), 0)
    const plannedDurationSeconds = blocks.reduce((total, block) => total + (block.planned_duration_seconds ?? 0), 0)
    const activeDates = new Set(blocks.filter((block) => actualFor(block) > 0).map((block) => sessionById.get(block.session_id)?.scheduled_date).filter(Boolean))
    const skillRows = new Map<string, { actual: number; planned: number; ratings: Array<{ rating: number; at: string }> }>()
    for (const block of blocks) {
      const row = skillRows.get(block.skill_id) ?? { actual: 0, planned: 0, ratings: [] }
      row.actual += actualFor(block)
      row.planned += block.planned_duration_seconds ?? 0
      skillRows.set(block.skill_id, row)
    }
    for (const checkin of checkins) {
      if (checkin.confidence_rating === null) continue
      const row = skillRows.get(checkin.skill_id) ?? { actual: 0, planned: 0, ratings: [] }
      const session = sessionById.get(checkin.session_id)
      row.ratings.push({ rating: checkin.confidence_rating, at: session?.completed_at ?? checkin.created_at })
      skillRows.set(checkin.skill_id, row)
    }
    return {
      from,
      to,
      trainingDays: activeDates.size,
      actualDurationSeconds,
      plannedDurationSeconds,
      completedPlannedSessions: sessions.filter((session) => session.entry_mode === 'planned' && session.status === 'completed').length,
      plannedSessions: sessions.filter((session) => session.entry_mode === 'planned').length,
      skills: [...skillRows.entries()].map(([skillId, row]) => {
        row.ratings.sort((a, b) => a.at.localeCompare(b.at))
        return {
          skillId,
          skillName: skills.get(skillId)?.name ?? 'Unknown skill',
          actualDurationSeconds: row.actual,
          plannedDurationSeconds: row.planned,
          latestConfidenceRating: row.ratings.at(-1)?.rating ?? null,
          previousConfidenceRating: row.ratings.at(-2)?.rating ?? null,
        }
      }).sort((a, b) => b.actualDurationSeconds - a.actualDurationSeconds || a.skillName.localeCompare(b.skillName)),
    }
  }

  private async validateBlocks(conn: Conn, userId: string, blocks: Array<{ skillId: string; drillId?: string | null; videoId?: string | null }>) {
    const repository = new TrainingRepository(conn)
    for (const block of blocks) {
      const options = await repository.getPracticeOptions(userId, block.skillId)
      if (!options) throw new Error('VALIDATION_ERROR: Skill not found')
      if (block.drillId && !options.drills.some((drill) => drill.id === block.drillId)) throw new Error('VALIDATION_ERROR: Drill is not linked to the selected skill')
      if (block.videoId && !options.videos.some((video) => video.id === block.videoId)) throw new Error('VALIDATION_ERROR: Video is not linked to the selected skill')
    }
  }

  private validateCheckins(blocks: Array<{ skillId: string }>, checkins: Array<{ skillId: string }>) {
    const practiced = new Set(blocks.map((block) => block.skillId))
    const seen = new Set<string>()
    for (const checkin of checkins) {
      if (!practiced.has(checkin.skillId)) throw new Error('VALIDATION_ERROR: Check-in skill is not part of this session')
      if (seen.has(checkin.skillId)) throw new Error('VALIDATION_ERROR: Only one check-in is allowed per skill')
      seen.add(checkin.skillId)
    }
  }

  private async refreshMirrors(conn: Conn, userId: string, sessionId: string, nodeId: string) {
    const repository = new TrainingRepository(conn)
    const blocks = await repository.listBlocks(userId, sessionId)
    const references = await repository.getReferences(userId, blocks)
    const skills = new Map(references.skills.map((row) => [row.id, row.node_id]))
    const drills = new Map(references.drills.map((row) => [row.id, row.node_id]))
    const videos = new Map(references.videos.map((row) => [row.id, row.node_id]))
    const graph = new GraphRepository(conn)
    await graph.softDeleteEdges(userId, nodeId, ['practices', 'contains'])
    for (const skillId of new Set(blocks.map((block) => block.skill_id))) await graph.createEdge({ userId, sourceNodeId: nodeId, targetNodeId: skills.get(skillId)!, edgeType: 'practices' })
    for (const drillId of new Set(blocks.flatMap((block) => block.drill_id ? [block.drill_id] : []))) await graph.createEdge({ userId, sourceNodeId: nodeId, targetNodeId: drills.get(drillId)!, edgeType: 'contains' })
    for (const videoId of new Set(blocks.flatMap((block) => block.video_id ? [block.video_id] : []))) await graph.createEdge({ userId, sourceNodeId: nodeId, targetNodeId: videos.get(videoId)!, edgeType: 'contains' })
  }

  private presentDetail(
    session: Row<'practice_sessions'>,
    blocks: Row<'practice_session_blocks'>[],
    checkins: Row<'practice_skill_checkins'>[],
    references: Awaited<ReturnType<TrainingRepository['getReferences']>>,
  ): TrainingSessionDetailDto {
    const skillMap = new Map(references.skills.map((row) => [row.id, row]))
    const drillMap = new Map(references.drills.map((row) => [row.id, row]))
    const videoMap = new Map(references.videos.map((row) => [row.id, row]))
    const now = Date.now()
    const presentedBlocks = blocks.map((block) => {
      const skill = skillMap.get(block.skill_id)
      if (!skill) throw new Error('INTERNAL_ERROR: Training skill reference is unavailable')
      const drill = block.drill_id ? drillMap.get(block.drill_id) : undefined
      const video = block.video_id ? videoMap.get(block.video_id) : undefined
      return {
        id: block.id,
        sessionId: block.session_id,
        skillId: block.skill_id,
        skill: { id: skill.id, nodeId: skill.node_id, title: skill.name, subtitle: skill.description, thumbnailUrl: null, sourceUrl: null },
        drillId: block.drill_id,
        drill: drill ? { id: drill.id, nodeId: drill.node_id, title: drill.title, subtitle: drill.description, thumbnailUrl: null, sourceUrl: null } : null,
        videoId: block.video_id,
        video: video ? { id: video.id, nodeId: video.node_id, title: video.title ?? video.source_url, subtitle: video.creator_name, thumbnailUrl: video.thumbnail_url, sourceUrl: video.source_url } : null,
        position: block.position,
        originalPosition: block.original_position,
        plannedDurationSeconds: block.planned_duration_seconds,
        originalPlannedDurationSeconds: block.original_planned_duration_seconds,
        actualDurationSeconds: block.actual_duration_seconds + (block.status === 'active' ? elapsedSeconds(block.timer_started_at, now) : 0),
        timerStartedAt: block.timer_started_at,
        status: block.status as 'planned'|'active'|'paused'|'completed'|'skipped',
        focusNote: block.focus_note,
        startedAt: block.started_at,
        completedAt: block.completed_at,
      }
    })
    return {
      session: {
        id: session.id,
        nodeId: session.node_id,
        scheduledDate: session.scheduled_date,
        timeZone: session.time_zone,
        title: session.title,
        status: session.status as 'planned'|'in_progress'|'completed'|'cancelled',
        entryMode: session.entry_mode as 'planned'|'quick'|'manual',
        overallRating: session.overall_rating,
        reflection: session.reflection,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        actualDurationSeconds: presentedBlocks.reduce((total, block) => total + block.actualDurationSeconds, 0),
        plannedDurationSeconds: presentedBlocks.reduce((total, block) => total + (block.plannedDurationSeconds ?? 0), 0),
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
      blocks: presentedBlocks,
      checkins: checkins.map((checkin) => ({ skillId: checkin.skill_id, confidenceRating: checkin.confidence_rating, note: checkin.note })),
    }
  }
}
