import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class TopicSkillRepository {
  constructor(private readonly db: Kysely<Database>) {}
  async createTopic(input: { userId: string; nodeId: string; name: string; description?: string | null; parentTopicId?: string | null; isSystem?: boolean }) {
    const now = nowIso(); const row = { id: createId('topic'), node_id: input.nodeId, user_id: input.userId, name: input.name, description: input.description ?? null, parent_topic_id: input.parentTopicId ?? null, sort_order: 0, is_system: input.isSystem ? 1 : 0, created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('topics').values(row).execute(); return row
  }
  async createSkill(input: { userId: string; nodeId: string; name: string; topicId?: string | null; difficulty?: string | null; status?: string; isSystem?: boolean }) {
    const now = nowIso(); const row = { id: createId('skill'), node_id: input.nodeId, user_id: input.userId, topic_id: input.topicId ?? null, name: input.name, description: null, difficulty: input.difficulty ?? null, status: input.status ?? 'not_started', is_system: input.isSystem ? 1 : 0, created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('skills').values(row).execute(); return row
  }
  async listTopics(userId: string) { return this.db.selectFrom('topics').selectAll().where('user_id','=',userId).where('deleted_at','is',null).orderBy('sort_order asc').orderBy('name asc').execute() }
  async listSkills(userId: string) { return this.db.selectFrom('skills').selectAll().where('user_id','=',userId).where('deleted_at','is',null).orderBy('name asc').execute() }
  async getTopic(userId: string, id: string) { return this.db.selectFrom('topics').selectAll().where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).executeTakeFirst() }
  async getSkill(userId: string, id: string) { return this.db.selectFrom('skills').selectAll().where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).executeTakeFirst() }
}
