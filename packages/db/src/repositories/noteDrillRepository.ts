import type { Kysely } from 'kysely'
import type { Database } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class NoteDrillRepository {
  constructor(private readonly db: Kysely<Database>) {}
  async createNote(input: { userId: string; nodeId: string; parentNodeId: string; body: string; noteType?: string; timestampSeconds?: number | null }) {
    const now = nowIso()
    const row = { id: createId('note'), node_id: input.nodeId, user_id: input.userId, parent_node_id: input.parentNodeId, body: input.body, timestamp_seconds: input.timestampSeconds ?? null, note_type: input.noteType ?? 'plain', created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('notes').values(row).execute()
    return row
  }
  async createDrill(input: { userId: string; nodeId: string; title: string; description?: string | null; instructions?: string | null; difficulty?: string | null; durationMinutes?: number | null; repetitionTarget?: number | null; status?: string }) {
    const now = nowIso()
    const row = { id: createId('drill'), node_id: input.nodeId, user_id: input.userId, title: input.title, description: input.description ?? null, instructions: input.instructions ?? null, difficulty: input.difficulty ?? null, duration_minutes: input.durationMinutes ?? null, repetition_target: input.repetitionTarget ?? null, status: input.status ?? 'planned', created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('drills').values(row).execute()
    return row
  }
}
