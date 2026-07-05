import type { Kysely } from 'kysely'
import { EDGE_TYPES, NODE_TYPES, SYMMETRIC_EDGE_TYPES, type EdgeType, type NodeType } from '@ttll/shared'
import type { Database, Row } from '../schema/database'
import { createId } from '../utils/id'
import { nowIso } from '../utils/time'

export class GraphRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async createNode(input: { userId: string; nodeType: NodeType; title: string; summary?: string | null; visibility?: 'private'|'unlisted'|'public' }) {
    if (!NODE_TYPES.includes(input.nodeType)) throw new Error(`Invalid node type: ${input.nodeType}`)
    const now = nowIso()
    const row = { id: createId('node'), user_id: input.userId, node_type: input.nodeType, title: input.title, summary: input.summary ?? null, visibility: input.visibility ?? 'private', created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('graph_nodes').values(row).execute()
    return row
  }

  async getNode(userId: string, id: string) {
    return this.db.selectFrom('graph_nodes').selectAll().where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).executeTakeFirst()
  }

  async updateNode(userId: string, id: string, patch: { title?: string; summary?: string | null; visibility?: string }) {
    const updated = await this.db.updateTable('graph_nodes').set({ ...patch, updated_at: nowIso() }).where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).returningAll().executeTakeFirst()
    if (!updated) throw new Error('NOT_FOUND')
    return updated
  }

  async softDeleteNode(userId: string, id: string) {
    const now = nowIso()
    await this.db.updateTable('graph_edges').set({ deleted_at: now, updated_at: now }).where('user_id','=',userId).where((eb) => eb.or([eb('source_node_id','=',id), eb('target_node_id','=',id)])).where('deleted_at','is',null).execute()
    await this.db.updateTable('graph_nodes').set({ deleted_at: now, updated_at: now }).where('user_id','=',userId).where('id','=',id).where('deleted_at','is',null).execute()
  }

  async createEdge(input: { userId: string; sourceNodeId: string; targetNodeId: string; edgeType: EdgeType; label?: string | null; position?: number | null; metadata?: unknown }) {
    if (!EDGE_TYPES.includes(input.edgeType)) throw new Error(`Invalid edge type: ${input.edgeType}`)
    if (input.sourceNodeId === input.targetNodeId) throw new Error('Self edges are not allowed')
    const [source, target] = await Promise.all([this.getNode(input.userId, input.sourceNodeId), this.getNode(input.userId, input.targetNodeId)])
    if (!source || !target) throw new Error('Cross-owner or missing node')
    validateEdgePair(source.node_type, target.node_type, input.edgeType)
    let sourceId = input.sourceNodeId
    let targetId = input.targetNodeId
    if ((SYMMETRIC_EDGE_TYPES as readonly string[]).includes(input.edgeType) && sourceId > targetId) [sourceId, targetId] = [targetId, sourceId]
    const now = nowIso()
    const row = { id: createId('edge'), user_id: input.userId, source_node_id: sourceId, target_node_id: targetId, edge_type: input.edgeType, label: input.label ?? null, weight: null, position: input.position ?? null, metadata_json: input.metadata === undefined ? null : JSON.stringify({ value: input.metadata }), created_at: now, updated_at: now, deleted_at: null }
    await this.db.insertInto('graph_edges').values(row).onConflict((oc) => oc.columns(['user_id','source_node_id','target_node_id','edge_type']).where('deleted_at','is',null).doNothing()).execute()
    return row
  }

  async related(userId: string, nodeId: string, edgeTypes?: EdgeType[]) {
    let q = this.db.selectFrom('graph_edges as e')
      .innerJoin('graph_nodes as n', (join) => join.onRef('n.id','=','e.target_node_id'))
      .select(['n.id','n.user_id','n.node_type','n.title','n.summary','n.visibility','n.created_at','n.updated_at','n.deleted_at'])
      .where('e.user_id','=',userId).where('e.source_node_id','=',nodeId).where('e.deleted_at','is',null).where('n.deleted_at','is',null)
    if (edgeTypes?.length) q = q.where('e.edge_type','in',edgeTypes)
    return q.orderBy('e.position asc').orderBy('n.updated_at desc').execute()
  }
}

function validateEdgePair(sourceType: string, targetType: string, edgeType: string) {
  const allowed: Record<string, Array<[string,string]>> = {
    belongs_to: [['skill','topic'], ['topic','topic']],
    explains: [['video','skill'], ['note','skill']],
    demonstrates: [['video','skill']],
    practices: [['drill','skill'], ['video','skill']],
    drill_for: [['drill','skill'], ['drill','video']],
    tagged_with: [['video','tag'], ['skill','tag'], ['note','tag'], ['drill','tag'], ['mistake','tag'], ['learning_path','tag']],
    contains: [['learning_path','video'], ['learning_path','skill'], ['learning_path','drill'], ['learning_path','note'], ['collection','video'], ['collection','skill'], ['collection','drill']],
    mentions: [['note','video'], ['note','skill'], ['note','topic'], ['note','drill'], ['note','mistake']],
    related_to: [['video','video'], ['skill','skill'], ['topic','topic'], ['drill','drill']],
    contrasts_with: [['skill','skill'], ['video','video']],
    requires: [['skill','skill']],
    prerequisite_of: [['skill','skill']],
    common_mistake_for: [['mistake','skill']],
    saved_from: [['video','source']],
    created_by: [['video','creator']],
    enables: [['skill','skill'], ['drill','skill']],
    copied_from: [['video','video'], ['skill','skill'], ['drill','drill']],
    forked_from: [['video','video'], ['skill','skill'], ['drill','drill']]
  }
  const pairs = allowed[edgeType] ?? []
  if (!pairs.some(([s,t]) => s === sourceType && t === targetType)) throw new Error(`Invalid ${edgeType} edge from ${sourceType} to ${targetType}`)
}
