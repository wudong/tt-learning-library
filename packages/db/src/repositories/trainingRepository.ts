import type { Kysely } from 'kysely'
import type { Database, NewRow, Row } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class TrainingRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async createSession(input: Omit<NewRow<'practice_sessions'>, 'id'|'created_at'|'updated_at'|'deleted_at'>) {
    const now = nowIso()
    const row: NewRow<'practice_sessions'> = { ...input, id: createId('session'), created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('practice_sessions').values(row).execute()
    return row as Row<'practice_sessions'>
  }

  async createBlock(input: Omit<NewRow<'practice_session_blocks'>, 'id'|'created_at'|'updated_at'|'deleted_at'>) {
    const now = nowIso()
    const row: NewRow<'practice_session_blocks'> = { ...input, id: createId('block'), created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('practice_session_blocks').values(row).execute()
    return row as Row<'practice_session_blocks'>
  }

  async createCheckin(input: Omit<NewRow<'practice_skill_checkins'>, 'id'|'created_at'|'updated_at'|'deleted_at'>) {
    const now = nowIso()
    const row: NewRow<'practice_skill_checkins'> = { ...input, id: createId('checkin'), created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('practice_skill_checkins').values(row).execute()
    return row as Row<'practice_skill_checkins'>
  }

  async getSession(userId: string, id: string, forUpdate = false) {
    let query = this.db.selectFrom('practice_sessions').selectAll()
      .where('user_id', '=', userId).where('id', '=', id).where('deleted_at', 'is', null)
    if (forUpdate) query = query.forUpdate()
    return query.executeTakeFirst()
  }

  async listSessions(userId: string, from: string, to: string) {
    return this.db.selectFrom('practice_sessions').selectAll()
      .where('user_id', '=', userId).where('scheduled_date', '>=', from).where('scheduled_date', '<=', to)
      .where('deleted_at', 'is', null)
      .orderBy('scheduled_date', 'asc').orderBy('created_at', 'asc').execute()
  }

  async listBlocks(userId: string, sessionId: string) {
    return this.db.selectFrom('practice_session_blocks').selectAll()
      .where('user_id', '=', userId).where('session_id', '=', sessionId).where('deleted_at', 'is', null)
      .orderBy('position', 'asc').orderBy('id', 'asc').execute()
  }

  async listBlocksForSessions(userId: string, sessionIds: string[]) {
    if (!sessionIds.length) return []
    return this.db.selectFrom('practice_session_blocks').selectAll()
      .where('user_id', '=', userId).where('session_id', 'in', sessionIds).where('deleted_at', 'is', null)
      .orderBy('session_id', 'asc').orderBy('position', 'asc').execute()
  }

  async getBlock(userId: string, sessionId: string, blockId: string, forUpdate = false) {
    let query = this.db.selectFrom('practice_session_blocks').selectAll()
      .where('user_id', '=', userId).where('session_id', '=', sessionId).where('id', '=', blockId).where('deleted_at', 'is', null)
    if (forUpdate) query = query.forUpdate()
    return query.executeTakeFirst()
  }

  async getRunningBlock(userId: string, sessionId: string) {
    return this.db.selectFrom('practice_session_blocks').selectAll()
      .where('user_id', '=', userId).where('session_id', '=', sessionId).where('status', '=', 'active')
      .where('deleted_at', 'is', null).forUpdate().executeTakeFirst()
  }

  async listCheckins(userId: string, sessionId: string) {
    return this.db.selectFrom('practice_skill_checkins').selectAll()
      .where('user_id', '=', userId).where('session_id', '=', sessionId).where('deleted_at', 'is', null)
      .orderBy('created_at', 'asc').execute()
  }

  async listCheckinsForSessions(userId: string, sessionIds: string[]) {
    if (!sessionIds.length) return []
    return this.db.selectFrom('practice_skill_checkins').selectAll()
      .where('user_id', '=', userId).where('session_id', 'in', sessionIds).where('deleted_at', 'is', null)
      .orderBy('created_at', 'asc').execute()
  }

  async updateSession(userId: string, id: string, patch: Partial<Row<'practice_sessions'>>) {
    const row = await this.db.updateTable('practice_sessions').set({ ...patch, updated_at: nowIso() })
      .where('user_id', '=', userId).where('id', '=', id).where('deleted_at', 'is', null)
      .returningAll().executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND: Training session not found')
    return row
  }

  async updateBlock(userId: string, sessionId: string, id: string, patch: Partial<Row<'practice_session_blocks'>>) {
    const row = await this.db.updateTable('practice_session_blocks').set({ ...patch, updated_at: nowIso() })
      .where('user_id', '=', userId).where('session_id', '=', sessionId).where('id', '=', id).where('deleted_at', 'is', null)
      .returningAll().executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND: Training block not found')
    return row
  }

  async softDeleteBlocks(userId: string, sessionId: string, ids: string[]) {
    if (!ids.length) return
    const now = nowIso()
    await this.db.updateTable('practice_session_blocks').set({ deleted_at: now, updated_at: now })
      .where('user_id', '=', userId).where('session_id', '=', sessionId).where('id', 'in', ids).where('deleted_at', 'is', null).execute()
  }

  async replaceCheckins(userId: string, sessionId: string, checkins: Array<{ skillId: string; confidenceRating?: number | null; note?: string | null }>) {
    const now = nowIso()
    await this.db.updateTable('practice_skill_checkins').set({ deleted_at: now, updated_at: now })
      .where('user_id', '=', userId).where('session_id', '=', sessionId).where('deleted_at', 'is', null).execute()
    for (const checkin of checkins) {
      await this.createCheckin({
        session_id: sessionId,
        user_id: userId,
        skill_id: checkin.skillId,
        confidence_rating: checkin.confidenceRating ?? null,
        note: checkin.note ?? null,
      })
    }
  }

  async softDeleteSession(userId: string, sessionId: string) {
    const session = await this.getSession(userId, sessionId, true)
    if (!session) throw new Error('NOT_FOUND: Training session not found')
    const now = nowIso()
    await this.db.updateTable('practice_skill_checkins').set({ deleted_at: now, updated_at: now }).where('user_id', '=', userId).where('session_id', '=', sessionId).where('deleted_at', 'is', null).execute()
    await this.db.updateTable('practice_session_blocks').set({ deleted_at: now, updated_at: now, timer_started_at: null }).where('user_id', '=', userId).where('session_id', '=', sessionId).where('deleted_at', 'is', null).execute()
    await this.db.updateTable('practice_sessions').set({ deleted_at: now, updated_at: now }).where('user_id', '=', userId).where('id', '=', sessionId).where('deleted_at', 'is', null).execute()
    return session
  }

  async getReferences(userId: string, blocks: Row<'practice_session_blocks'>[]) {
    const skillIds = [...new Set(blocks.map((block) => block.skill_id))]
    const drillIds = [...new Set(blocks.flatMap((block) => block.drill_id ? [block.drill_id] : []))]
    const videoIds = [...new Set(blocks.flatMap((block) => block.video_id ? [block.video_id] : []))]
    const [skills, drills, videos] = await Promise.all([
      skillIds.length ? this.db.selectFrom('skills').selectAll().where('user_id', '=', userId).where('id', 'in', skillIds).where('deleted_at', 'is', null).execute() : [],
      drillIds.length ? this.db.selectFrom('drills').selectAll().where('user_id', '=', userId).where('id', 'in', drillIds).where('deleted_at', 'is', null).execute() : [],
      videoIds.length ? this.db.selectFrom('videos').selectAll().where('user_id', '=', userId).where('id', 'in', videoIds).where('deleted_at', 'is', null).execute() : [],
    ])
    return { skills, drills, videos }
  }

  async getPracticeOptions(userId: string, skillId: string) {
    const skill = await this.db.selectFrom('skills').selectAll().where('user_id', '=', userId).where('id', '=', skillId).where('deleted_at', 'is', null).executeTakeFirst()
    if (!skill) return undefined
    const videos = await this.db.selectFrom('videos as v')
      .innerJoin('graph_edges as e', 'e.source_node_id', 'v.node_id')
      .selectAll('v')
      .where('v.user_id', '=', userId).where('e.user_id', '=', userId).where('e.target_node_id', '=', skill.node_id)
      .where('e.edge_type', 'in', ['explains', 'demonstrates']).where('e.deleted_at', 'is', null).where('v.deleted_at', 'is', null)
      .orderBy('v.updated_at', 'desc').execute()
    const drills = await this.db.selectFrom('drills as d')
      .innerJoin('graph_edges as e', 'e.source_node_id', 'd.node_id')
      .selectAll('d')
      .where('d.user_id', '=', userId).where('e.user_id', '=', userId).where('e.target_node_id', '=', skill.node_id)
      .where('e.edge_type', 'in', ['drill_for', 'practices']).where('e.deleted_at', 'is', null).where('d.deleted_at', 'is', null)
      .orderBy('d.updated_at', 'desc').execute()
    return { skill, videos, drills }
  }
}
