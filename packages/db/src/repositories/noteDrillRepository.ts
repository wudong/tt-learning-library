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
  async createDrill(input: { userId: string; nodeId: string; title: string; description?: string | null; diagramUrl?: string | null; instructions?: string | null; difficulty?: string | null; durationMinutes?: number | null; repetitionTarget?: number | null; status?: string; isSystem?: boolean }) {
    const now = nowIso()
    const row = { id: createId('drill'), node_id: input.nodeId, user_id: input.userId, title: input.title, description: input.description ?? null, diagram_url: input.diagramUrl ?? null, instructions: input.instructions ?? null, difficulty: input.difficulty ?? null, duration_minutes: input.durationMinutes ?? null, repetition_target: input.repetitionTarget ?? null, status: input.status ?? 'planned', is_system: input.isSystem ? 1 : 0, is_pinned: 0, created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('drills').values(row).execute()
    return row
  }
  listDrills(userId: string) {
    return this.db.selectFrom('drills').selectAll().where('user_id', '=', userId).where('deleted_at', 'is', null)
      .orderBy('is_pinned', 'desc').orderBy('updated_at', 'desc').orderBy('id', 'asc').execute()
  }
  listDrillsByNodeIds(userId: string, nodeIds: string[]) {
    if (!nodeIds.length) return Promise.resolve([])
    return this.db.selectFrom('drills').selectAll()
      .where('user_id', '=', userId)
      .where('node_id', 'in', nodeIds)
      .where('deleted_at', 'is', null)
      .orderBy('is_pinned', 'desc')
      .orderBy('updated_at', 'desc')
      .orderBy('id', 'asc')
      .execute()
  }
  getDrillByNodeId(userId: string, nodeId: string) {
    return this.db.selectFrom('drills').selectAll()
      .where('user_id', '=', userId)
      .where('node_id', '=', nodeId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
  }
  async setPinnedByNode(userId: string, nodeId: string, pinned: boolean) {
    const row = await this.db.updateTable('drills').set({ is_pinned: pinned ? 1 : 0, updated_at: nowIso() })
      .where('user_id', '=', userId).where('node_id', '=', nodeId).where('deleted_at', 'is', null).returning('is_pinned').executeTakeFirst()
    if (!row) throw new Error('NOT_FOUND: Drill not found')
    return row
  }
  async createSteps(userId: string, drillId: string, steps: Array<{ actor:string; stroke:string; spin:string; fromZone:string; targetZone:string; instruction?:string|null }>) {
    const now = nowIso()
    if (!steps.length) return []
    const rows = steps.map((step, position) => ({ id:createId('drillstep'), drill_id:drillId, user_id:userId, position, actor:step.actor, stroke:step.stroke, spin:step.spin, from_zone:step.fromZone, target_zone:step.targetZone, instruction:step.instruction ?? null, created_at:now, updated_at:now, deleted_at:null }))
    await this.db.insertInto('drill_steps').values(rows).execute()
    return rows
  }
  listSteps(userId: string, drillId: string) {
    return this.db.selectFrom('drill_steps').selectAll().where('user_id','=',userId).where('drill_id','=',drillId).where('deleted_at','is',null).orderBy('position','asc').execute()
  }
}
