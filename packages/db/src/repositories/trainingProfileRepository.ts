import type { Kysely } from 'kysely'
import type { Database, NewRow, Row } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class TrainingProfileRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async list(userId: string) {
    return this.db.selectFrom('training_profiles')
      .selectAll()
      .where('user_id', '=', userId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'asc')
      .execute()
  }

  async get(userId: string, id: string) {
    return this.db.selectFrom('training_profiles')
      .selectAll()
      .where('user_id', '=', userId)
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
  }

  async getOrCreateSelf(userId: string) {
    const existing = await this.db.selectFrom('training_profiles')
      .selectAll()
      .where('user_id', '=', userId)
      .where('profile_type', '=', 'self')
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (existing) return existing

    const user = await this.db.selectFrom('users')
      .select(['display_name'])
      .where('id', '=', userId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!user) throw new Error('NOT_FOUND: User not found')

    const now = nowIso()
    const row: NewRow<'training_profiles'> = {
      id: createId('profile'),
      user_id: userId,
      display_name: user.display_name?.trim() || 'My training',
      profile_type: 'self',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }

    try {
      await this.db.insertInto('training_profiles').values(row).execute()
      return row as Row<'training_profiles'>
    } catch (error) {
      const concurrent = await this.db.selectFrom('training_profiles')
        .selectAll()
        .where('user_id', '=', userId)
        .where('profile_type', '=', 'self')
        .where('deleted_at', 'is', null)
        .executeTakeFirst()
      if (concurrent) return concurrent
      throw error
    }
  }

  async resolve(userId: string, profileId?: string | null) {
    if (!profileId) return this.getOrCreateSelf(userId)
    const profile = await this.get(userId, profileId)
    if (!profile) throw new Error('NOT_FOUND: Training profile not found')
    return profile
  }

  async createPlayer(userId: string, displayName: string) {
    const now = nowIso()
    const row: NewRow<'training_profiles'> = {
      id: createId('profile'),
      user_id: userId,
      display_name: displayName,
      profile_type: 'player',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
    await this.db.insertInto('training_profiles').values(row).execute()
    return row as Row<'training_profiles'>
  }

  async rename(userId: string, id: string, displayName: string) {
    const row = await this.db.updateTable('training_profiles')
      .set({ display_name: displayName, updated_at: nowIso() })
      .where('user_id', '=', userId)
      .where('id', '=', id)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND: Training profile not found')
    return row
  }

  async countActive(userId: string) {
    const row = await this.db.selectFrom('training_profiles')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('user_id', '=', userId)
      .where('deleted_at', 'is', null)
      .executeTakeFirstOrThrow()
    return Number(row.count)
  }

  async hasSessions(userId: string, profileId: string) {
    const row = await this.db.selectFrom('practice_sessions')
      .select('id')
      .where('user_id', '=', userId)
      .where('profile_id', '=', profileId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    return !!row
  }

  async softDelete(userId: string, id: string) {
    const now = nowIso()
    const row = await this.db.updateTable('training_profiles')
      .set({ deleted_at: now, updated_at: now })
      .where('user_id', '=', userId)
      .where('id', '=', id)
      .where('profile_type', '=', 'player')
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND: Player profile not found')
    return row
  }

  async setSessionProfile(userId: string, sessionId: string, profileId: string) {
    const row = await this.db.updateTable('practice_sessions')
      .set({ profile_id: profileId, updated_at: nowIso() })
      .where('user_id', '=', userId)
      .where('id', '=', sessionId)
      .where('deleted_at', 'is', null)
      .returningAll()
      .executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND: Training session not found')
    return row
  }

  async getForSession(userId: string, sessionId: string) {
    const session = await this.db.selectFrom('practice_sessions')
      .select(['profile_id'])
      .where('user_id', '=', userId)
      .where('id', '=', sessionId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!session) throw new Error('NOT_FOUND: Training session not found')
    return session.profile_id ? this.resolve(userId, session.profile_id) : this.getOrCreateSelf(userId)
  }

  async listSessionRows(userId: string, from: string, to: string, profile: Row<'training_profiles'>) {
    return this.db.selectFrom('practice_sessions')
      .selectAll()
      .where('user_id', '=', userId)
      .where('scheduled_date', '>=', from)
      .where('scheduled_date', '<=', to)
      .where('deleted_at', 'is', null)
      .where((eb) => profile.profile_type === 'self'
        ? eb.or([eb('profile_id', '=', profile.id), eb('profile_id', 'is', null)])
        : eb('profile_id', '=', profile.id))
      .orderBy('scheduled_date', 'asc')
      .orderBy('created_at', 'asc')
      .execute()
  }
}
