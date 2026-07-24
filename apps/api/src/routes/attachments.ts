import { Hono } from 'hono'
import type { Kysely } from 'kysely'
import { AttachmentRepository, type Database } from '@ttll/db'
import { getPrincipal } from '../auth/principal'
import { AttachmentService } from '../services/attachmentService'

const MAX_REQUEST_BYTES = 5 * 1024 * 1024 + 64 * 1024

export function attachmentRoutes(db: Kysely<Database>) {
  const app = new Hono()
  app.post('/', async (c) => {
    const contentLength = Number(c.req.header('content-length') ?? 0)
    if (contentLength > MAX_REQUEST_BYTES) throw new Error('VALIDATION_ERROR: Picture upload is too large')
    const form = await c.req.formData()
    const file = form.get('picture')
    const parentNodeId = form.get('parentNodeId')
    if (!(file instanceof File) || typeof parentNodeId !== 'string' || !parentNodeId) {
      throw new Error('VALIDATION_ERROR: picture and parentNodeId are required')
    }
    if (file.size > 5 * 1024 * 1024) throw new Error('VALIDATION_ERROR: Pictures may be at most 5 MB')
    const row = await new AttachmentService(db).create(getPrincipal(c).userId, {
      parentNodeId, fileName: file.name, declaredMediaType: file.type,
      content: new Uint8Array(await file.arrayBuffer()),
    })
    return c.json({ data: presentAttachment(row) }, 201)
  })
  app.get('/', async (c) => {
    const parentNodeId = c.req.query('parentNodeId')
    if (!parentNodeId) throw new Error('VALIDATION_ERROR: parentNodeId is required')
    const rows = await new AttachmentRepository(db).list(getPrincipal(c).userId, parentNodeId)
    return c.json({ data: rows.map(presentAttachment) })
  })
  app.get('/:id/content', async (c) => {
    const row = await new AttachmentRepository(db).get(getPrincipal(c).userId, c.req.param('id'))
    if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'Picture not found' } }, 404)
    return new Response(row.content as BodyInit, {
      headers: {
        'content-type': row.media_type, 'content-length': String(row.byte_size),
        'cache-control': 'private, no-store', 'content-disposition': `inline; filename="${row.file_name.replaceAll('"', '_')}"`,
        'x-content-type-options': 'nosniff',
      },
    })
  })
  app.delete('/:id', async (c) => {
    return c.json({ data: await new AttachmentService(db).delete(getPrincipal(c).userId, c.req.param('id')) })
  })
  return app
}

function presentAttachment(row: { id: string; node_id: string; parent_node_id: string; file_name: string; media_type: string; byte_size: number; width: number | null; height: number | null; created_at: string; updated_at: string }) {
  return { id: row.id, nodeId: row.node_id, parentNodeId: row.parent_node_id, fileName: row.file_name, mediaType: row.media_type, byteSize: row.byte_size, width: row.width, height: row.height, createdAt: row.created_at, updatedAt: row.updated_at }
}
