import { expect, test } from 'bun:test'
import { inspectImage } from '../apps/api/src/services/attachmentService'

test('picture signature inspection identifies PNG dimensions', () => {
  const bytes = new Uint8Array(24)
  bytes.set([0x89, 0x50, 0x4e, 0x47], 0)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  bytes.set([0, 0, 2, 128, 0, 0, 1, 224], 16)
  expect(inspectImage(bytes)).toEqual({ mediaType: 'image/png', width: 640, height: 480 })
})

test('picture signature inspection rejects a renamed non-image payload', () => {
  expect(inspectImage(new TextEncoder().encode('not really a png'))).toBeNull()
})
