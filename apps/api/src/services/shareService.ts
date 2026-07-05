import type { Kysely } from 'kysely'
import type { Database, Row } from '@ttll/db'
import { GraphRepository, ShareRepository } from '@ttll/db'

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Allowlisted public node DTO — never exposes id, visibility, timestamps, or user_id */
function presentPublicNode(row: Row<'graph_nodes'>) {
  return { nodeType: row.node_type, title: row.title, summary: row.summary }
}

export class ShareService {
  constructor(private readonly db: Kysely<Database>) {}
  async createLink(userId: string, targetNodeId: string, expiresAt?: string | null) {
    const target = await new GraphRepository(this.db).getNode(userId, targetNodeId)
    if (!target) throw new Error('NOT_FOUND')
    if (!['video','skill','drill','learning_path'].includes(target.node_type)) throw new Error('CONFLICT: Object type is not shareable in MVP')
    const raw = crypto.randomUUID().replaceAll('-','') + crypto.randomUUID().replaceAll('-','')
    const tokenHash = await sha256(raw)
    const row = await new ShareRepository(this.db).create({ userId, targetNodeId, tokenHash, tokenPrefix: raw.slice(0, 8), expiresAt })
    return { row, rawToken: raw }
  }
  async getPublicProjection(rawToken: string) {
    const tokenHash = await sha256(rawToken)
    const share = await new ShareRepository(this.db).getByHash(tokenHash)
    if (!share) throw new Error('NOT_FOUND')
    if (share.revoked_at) throw new Error('NOT_FOUND: Share link has been revoked')
    if (share.deleted_at) throw new Error('NOT_FOUND')
    if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) throw new Error('EXPIRED')
    const node = await new GraphRepository(this.db).getNode(share.user_id, share.target_node_id)
    if (!node) throw new Error('NOT_FOUND')
    return { nodeType: node.node_type, title: node.title, summary: node.summary, projection: { node: presentPublicNode(node) } }
  }
}
