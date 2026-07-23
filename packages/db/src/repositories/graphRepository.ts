import type { Kysely } from 'kysely'
import { EDGE_TYPES, NODE_TYPES, SYMMETRIC_EDGE_TYPES, isAllowedRelationship, type EdgeType, type NodeType } from '@ttll/shared'
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
    if (!EDGE_TYPES.includes(input.edgeType)) throw new Error(`VALIDATION_ERROR: Invalid edge type: ${input.edgeType}`)
    if (input.sourceNodeId === input.targetNodeId) throw new Error('VALIDATION_ERROR: Self edges are not allowed')
    const [source, target] = await Promise.all([this.getNode(input.userId, input.sourceNodeId), this.getNode(input.userId, input.targetNodeId)])
    if (!source || !target) throw new Error('NOT_FOUND: Graph node not found')
    if (!isAllowedRelationship(source.node_type as NodeType, target.node_type as NodeType, input.edgeType)) {
      throw new Error(`VALIDATION_ERROR: Invalid ${input.edgeType} edge from ${source.node_type} to ${target.node_type}`)
    }
    let sourceId = input.sourceNodeId
    let targetId = input.targetNodeId
    if ((SYMMETRIC_EDGE_TYPES as readonly string[]).includes(input.edgeType) && sourceId > targetId) [sourceId, targetId] = [targetId, sourceId]
    const now = nowIso()
    const row = { id: createId('edge'), user_id: input.userId, source_node_id: sourceId, target_node_id: targetId, edge_type: input.edgeType, label: input.label ?? null, weight: null, position: input.position ?? null, metadata_json: input.metadata === undefined ? null : JSON.stringify({ value: input.metadata }), created_at: now, updated_at: now, deleted_at: null }
    const inserted = await this.db.insertInto('graph_edges').values(row).onConflict((oc) => oc.columns(['user_id','source_node_id','target_node_id','edge_type']).where('deleted_at','is',null).doNothing()).returningAll().executeTakeFirst()
    if (inserted) return inserted
    const existing = await this.db.selectFrom('graph_edges').selectAll()
      .where('user_id', '=', input.userId).where('source_node_id', '=', sourceId).where('target_node_id', '=', targetId)
      .where('edge_type', '=', input.edgeType).where('deleted_at', 'is', null).executeTakeFirst()
    if (!existing) throw new Error('CONFLICT: Relationship could not be created')
    return existing
  }

  async related(userId: string, nodeId: string, edgeTypes?: EdgeType[]) {
    const relationships = await this.relationships(userId, nodeId, edgeTypes)
    const unique = new Map<string, Row<'graph_nodes'>>()
    for (const relationship of relationships) unique.set(relationship.node.id, relationship.node)
    return [...unique.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))
  }

  async relationships(userId: string, nodeId: string, edgeTypes?: EdgeType[]) {
    let outgoingQuery = this.db.selectFrom('graph_edges as e')
      .innerJoin('graph_nodes as n', (join) => join.onRef('n.id','=','e.target_node_id'))
      .selectAll('e').select(['n.id as node_id','n.user_id as node_user_id','n.node_type','n.title','n.summary','n.visibility','n.created_at as node_created_at','n.updated_at as node_updated_at','n.deleted_at as node_deleted_at'])
      .where('e.user_id','=',userId).where('e.source_node_id','=',nodeId).where('e.deleted_at','is',null).where('n.user_id','=',userId).where('n.deleted_at','is',null)
    let incomingQuery = this.db.selectFrom('graph_edges as e')
      .innerJoin('graph_nodes as n', (join) => join.onRef('n.id','=','e.source_node_id'))
      .selectAll('e').select(['n.id as node_id','n.user_id as node_user_id','n.node_type','n.title','n.summary','n.visibility','n.created_at as node_created_at','n.updated_at as node_updated_at','n.deleted_at as node_deleted_at'])
      .where('e.user_id','=',userId).where('e.target_node_id','=',nodeId).where('e.deleted_at','is',null).where('n.user_id','=',userId).where('n.deleted_at','is',null)
    if (edgeTypes?.length) {
      outgoingQuery = outgoingQuery.where('e.edge_type','in',edgeTypes)
      incomingQuery = incomingQuery.where('e.edge_type','in',edgeTypes)
    }
    const [outgoing, incoming] = await Promise.all([outgoingQuery.execute(), incomingQuery.execute()])
    const mapRow = (row: typeof outgoing[number], direction: 'outgoing'|'incoming') => ({
      direction,
      edge: { id: row.id, user_id: row.user_id, source_node_id: row.source_node_id, target_node_id: row.target_node_id, edge_type: row.edge_type, label: row.label, weight: row.weight, position: row.position, metadata_json: row.metadata_json, created_at: row.created_at, updated_at: row.updated_at, deleted_at: row.deleted_at } satisfies Row<'graph_edges'>,
      node: { id: row.node_id, user_id: row.node_user_id, node_type: row.node_type, title: row.title, summary: row.summary, visibility: row.visibility, created_at: row.node_created_at, updated_at: row.node_updated_at, deleted_at: row.node_deleted_at } satisfies Row<'graph_nodes'>
    })
    return [...outgoing.map((row) => mapRow(row, 'outgoing')), ...incoming.map((row) => mapRow(row, 'incoming'))]
      .sort((a, b) => b.edge.created_at.localeCompare(a.edge.created_at) || a.edge.id.localeCompare(b.edge.id))
  }

  async softDeleteEdges(userId: string, sourceNodeId: string, edgeTypes: EdgeType[]) {
    const now = nowIso()
    return this.db.updateTable('graph_edges')
      .set({ deleted_at: now, updated_at: now })
      .where('user_id', '=', userId)
      .where('source_node_id', '=', sourceNodeId)
      .where('edge_type', 'in', edgeTypes)
      .where('deleted_at', 'is', null)
      .execute()
  }

  async countIncomingVideos(userId: string, targetNodeIds: string[], edgeTypes: EdgeType[]) {
    if (!targetNodeIds.length) return new Map<string, number>()
    const rows = await this.db.selectFrom('graph_edges as e')
      .innerJoin('graph_nodes as source', 'source.id', 'e.source_node_id')
      .select('e.target_node_id')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('e.user_id', '=', userId)
      .where('e.target_node_id', 'in', targetNodeIds)
      .where('e.edge_type', 'in', edgeTypes)
      .where('e.deleted_at', 'is', null)
      .where('source.user_id', '=', userId)
      .where('source.node_type', '=', 'video')
      .where('source.deleted_at', 'is', null)
      .groupBy('e.target_node_id')
      .execute()
    return new Map(rows.map((row) => [row.target_node_id, Number(row.count)]))
  }

}
