import { describe, expect, test } from 'bun:test'
import { youtubeEmbedUrl } from '../apps/web/src/components/YouTubeEmbed'

describe('YouTube embed URL', () => {
  test('uses the privacy-enhanced YouTube origin', () => {
    expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  test('rejects missing and unsafe video IDs', () => {
    expect(youtubeEmbedUrl(null)).toBeNull()
    expect(youtubeEmbedUrl('video/id?autoplay=1')).toBeNull()
  })
})
