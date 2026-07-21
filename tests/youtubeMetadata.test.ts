import { expect, test } from 'bun:test'
import { YouTubeMetadataService } from '../apps/api/src/services/youtubeMetadataService'

const validPayload = {
  title: 'Table Tennis Serve Tutorial',
  author_name: 'TT Coach',
  thumbnail_url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg'
}

test('normalizes bounded YouTube oEmbed metadata', async () => {
  const service = new YouTubeMetadataService(async (input, init) => {
    expect(input.toString()).toContain('https://www.youtube.com/oembed')
    expect(init?.redirect).toBe('error')
    return Response.json(validPayload)
  })
  expect(await service.fetch('abc123')).toEqual({ title: validPayload.title, creatorName: validPayload.author_name, thumbnailUrl: validPayload.thumbnail_url })
})

test('rejects invalid video IDs without fetching', async () => {
  let called = false
  const service = new YouTubeMetadataService(async () => { called = true; return Response.json(validPayload) })
  expect(await service.fetch('../internal')).toBeNull()
  expect(called).toBe(false)
})

test('rejects untrusted thumbnail hosts and malformed responses', async () => {
  const untrusted = new YouTubeMetadataService(async () => Response.json({ ...validPayload, thumbnail_url: 'https://example.com/image.jpg' }))
  const malformed = new YouTubeMetadataService(async () => new Response('{bad json', { status: 200 }))
  expect(await untrusted.fetch('abc123')).toBeNull()
  expect(await malformed.fetch('abc123')).toBeNull()
})

test('rejects oversized responses', async () => {
  const service = new YouTubeMetadataService(async () => new Response('x'.repeat(70 * 1024), { status: 200 }))
  expect(await service.fetch('abc123')).toBeNull()
})

test('treats timeout and provider errors as missing metadata', async () => {
  const timeout = new YouTubeMetadataService((_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
  }), 5)
  const notFound = new YouTubeMetadataService(async () => new Response('', { status: 404 }))
  expect(await timeout.fetch('abc123')).toBeNull()
  expect(await notFound.fetch('abc123')).toBeNull()
})
