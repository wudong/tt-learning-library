import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class TopicSkillRepository {
  constructor(private readonly db: Kysely<Database>) {}
  async createTopic(input: { userId: string; nodeId: string; name: string; description?: string | null; parentTopicId?: string | null; isSystem?: boolean; isHidden?: boolean }) {
    const now = nowIso(); const row = { id: createId('topic'), node_id: input.nodeId, user_id: input.userId, name: input.name, description: input.description ?? null, parent_topic_id: input.parentTopicId ?? null, sort_order: 0, is_system: input.isSystem ? 1 : 0, is_hidden: input.isHidden ? 1 : 0, is_pinned: 0, created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('topics').values(row).execute(); return row
  }
  async createSkill(input: { userId: string; nodeId: string; name: string; topicId?: string | null; difficulty?: string | null; status?: string; isSystem?: boolean }) {
    const now = nowIso(); const row = { id: createId('skill'), node_id: input.nodeId, user_id: input.userId, topic_id: input.topicId ?? null, name: input.name, description: null, difficulty: input.difficulty ?? null, status: input.status ?? 'not_started', is_system: input.isSystem ? 1 : 0, is_pinned: 0, created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('skills').values(row).execute(); return row
  }
  async listTopics(userId: string) { return this.db.selectFrom('topics').selectAll().where('user_id','=',userId).where('deleted_at','is',null).orderBy('is_pinned', 'desc').orderBy('sort_order', 'asc').orderBy('name', 'asc').execute() }
  async listSkills(userId: string) { return this.db.selectFrom('skills').selectAll().where('user_id','=',userId).where('deleted_at','is',null).orderBy('is_pinned', 'desc').orderBy('name', 'asc').execute() }
  async listSystemTopics(userId: string) { return this.db.selectFrom('topics').selectAll().where('user_id','=',userId).where('is_system','=',1).where('deleted_at','is',null).orderBy('is_pinned', 'desc').orderBy('sort_order', 'asc').orderBy('name', 'asc').execute() }
  async listSystemSkills(userId: string) { return this.db.selectFrom('skills').selectAll().where('user_id','=',userId).where('is_system','=',1).where('deleted_at','is',null).orderBy('is_pinned', 'desc').orderBy('name', 'asc').execute() }
  async getTopics(userId: string, ids: string[]) {
    if (!ids.length) return []
    return this.db.selectFrom('topics').selectAll().where('user_id','=',userId).where('id','in',ids).where('deleted_at','is',null).execute()
  }
  async getSkills(userId: string, ids: string[]) {
    if (!ids.length) return []
    return this.db.selectFrom('skills').selectAll().where('user_id','=',userId).where('id','in',ids).where('deleted_at','is',null).execute()
  }
  async getTopic(userId: string, id: string) { return this.db.selectFrom('topics').selectAll().where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).executeTakeFirst() }
  async setTopicHidden(userId: string, id: string, hidden: boolean) {
    const row = await this.db.updateTable('topics').set({ is_hidden: hidden ? 1 : 0, updated_at: nowIso() })
      .where('user_id', '=', userId).where('id', '=', id).where('deleted_at', 'is', null).returningAll().executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND: Topic not found')
    return row
  }
  async setPinnedByNode(userId: string, nodeId: string, pinned: boolean) {
    const node = await this.db.selectFrom('graph_nodes').select('node_type').where('user_id', '=', userId).where('id', '=', nodeId).where('deleted_at', 'is', null).executeTakeFirst()
    if (!node || !['topic', 'skill'].includes(node.node_type)) throw new Error('NOT_FOUND: Topic or Skill not found')
    if (node.node_type === 'topic') {
      return this.db.updateTable('topics').set({ is_pinned: pinned ? 1 : 0, updated_at: nowIso() }).where('user_id', '=', userId).where('node_id', '=', nodeId).where('deleted_at', 'is', null).returning('is_pinned').executeTakeFirstOrThrow()
    }
    return this.db.updateTable('skills').set({ is_pinned: pinned ? 1 : 0, updated_at: nowIso() }).where('user_id', '=', userId).where('node_id', '=', nodeId).where('deleted_at', 'is', null).returning('is_pinned').executeTakeFirstOrThrow()
  }
  async getSkill(userId: string, id: string) { return this.db.selectFrom('skills').selectAll().where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).executeTakeFirst() }
}
