import { z } from 'zod'

const MAX_RESPONSE_BYTES = 64 * 1024
const VIDEO_ID = /^[A-Za-z0-9_-]{6,32}$/
const OEmbedResponseSchema = z.object({
  title: z.string().trim().min(1).max(500),
  author_name: z.string().trim().min(1).max(500),
  thumbnail_url: z.string().url().max(2048)
})

export interface VideoMetadata {
  title: string
  creatorName: string
  thumbnailUrl: string
}

export interface VideoMetadataProvider {
  fetch(externalId: string): Promise<VideoMetadata | null>
}

type Fetcher = typeof fetch

export class YouTubeMetadataService implements VideoMetadataProvider {
  constructor(private readonly fetcher: Fetcher = fetch, private readonly timeoutMs = 2500) {}

  async fetch(externalId: string): Promise<VideoMetadata | null> {
    if (!VIDEO_ID.test(externalId)) return null
    const canonicalUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(externalId)}`
    const endpoint = new URL('https://www.youtube.com/oembed')
    endpoint.searchParams.set('url', canonicalUrl)
    endpoint.searchParams.set('format', 'json')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetcher(endpoint, {
        headers: { accept: 'application/json' },
        redirect: 'error',
        signal: controller.signal
      })
      if (!response.ok) return null
      const contentLength = Number(response.headers.get('content-length') ?? 0)
      if (contentLength > MAX_RESPONSE_BYTES) return null
      const body = await readBoundedText(response, MAX_RESPONSE_BYTES)
      const parsed = OEmbedResponseSchema.safeParse(JSON.parse(body))
      if (!parsed.success || !isAllowedThumbnail(parsed.data.thumbnail_url)) return null
      return {
        title: parsed.data.title,
        creatorName: parsed.data.author_name,
        thumbnailUrl: parsed.data.thumbnail_url
      }
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > maxBytes) {
      await reader.cancel()
      throw new Error('Metadata response too large')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

function isAllowedThumbnail(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return url.protocol === 'https:' && (host === 'i.ytimg.com' || host.endsWith('.ytimg.com'))
  } catch {
    return false
  }
}
