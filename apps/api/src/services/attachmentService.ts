import type { Kysely } from 'kysely'
import { AttachmentRepository, GraphRepository, type Database } from '@ttll/db'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/webp'

export class AttachmentService {
  constructor(private readonly db: Kysely<Database>) {}

  async create(userId: string, input: { parentNodeId: string; fileName: string; declaredMediaType: string; content: Uint8Array }) {
    if (!input.content.byteLength || input.content.byteLength > MAX_IMAGE_BYTES) {
      throw new Error('VALIDATION_ERROR: Pictures must be between 1 byte and 5 MB')
    }
    const detected = inspectImage(input.content)
    if (!detected || detected.mediaType !== input.declaredMediaType) {
      throw new Error('VALIDATION_ERROR: Only genuine JPEG, PNG, and WebP pictures are supported')
    }
    return this.db.transaction().execute(async (trx) => {
      const graph = new GraphRepository(trx)
      const parent = await graph.getNode(userId, input.parentNodeId)
      if (!parent) throw new Error('NOT_FOUND: Knowledge node not found')
      if (!['topic', 'skill', 'drill', 'video'].includes(parent.node_type)) throw new Error(`VALIDATION_ERROR: Pictures cannot attach to ${parent.node_type}`)
      const fileName = safeFileName(input.fileName)
      const node = await graph.createNode({ userId, nodeType: 'picture', title: fileName })
      const picture = await new AttachmentRepository(trx).create({
        userId, nodeId: node.id, parentNodeId: parent.id, fileName,
        mediaType: detected.mediaType, content: input.content, width: detected.width, height: detected.height,
      })
      if (parent.node_type === 'topic') await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: parent.id, edgeType: 'belongs_to' })
      else if (parent.node_type === 'skill') await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: parent.id, edgeType: 'demonstrates' })
      else if (parent.node_type === 'drill') await graph.createEdge({ userId, sourceNodeId: parent.id, targetNodeId: node.id, edgeType: 'drill_for' })
      else await graph.createEdge({ userId, sourceNodeId: node.id, targetNodeId: parent.id, edgeType: 'related_to' })
      return picture
    })
  }

  async delete(userId: string, id: string) {
    return this.db.transaction().execute(async (trx) => {
      const repository = new AttachmentRepository(trx)
      const picture = await repository.get(userId, id)
      if (!picture) throw new Error('NOT_FOUND: Picture not found')
      await repository.softDelete(userId, id)
      await new GraphRepository(trx).softDeleteNode(userId, picture.node_id)
      return { deleted: true as const }
    })
  }
}

function safeFileName(value: string): string {
  const cleaned = value.replace(/[^\p{L}\p{N}._ -]/gu, '_').trim().slice(0, 180)
  return cleaned || 'pasted-picture'
}

export function inspectImage(bytes: Uint8Array): { mediaType: SupportedMediaType; width: number | null; height: number | null } | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52) {
    return { mediaType: 'image/png', width: readU32(bytes, 16), height: readU32(bytes, 20) }
  }
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { mediaType: 'image/webp', width: null, height: null }
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let offset = 2; offset + 8 < bytes.length;) {
      if (bytes[offset] !== 0xff) { offset++; continue }
      const marker = bytes[offset + 1]!
      if (marker === 0xd9 || marker === 0xda) break
      const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!
      if (length < 2 || offset + length + 2 > bytes.length) break
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { mediaType: 'image/jpeg', height: (bytes[offset + 5]! << 8) | bytes[offset + 6]!, width: (bytes[offset + 7]! << 8) | bytes[offset + 8]! }
      }
      offset += length + 2
    }
    return { mediaType: 'image/jpeg', width: null, height: null }
  }
  return null
}

function readU32(bytes: Uint8Array, offset: number) {
  return ((bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!) >>> 0
}
