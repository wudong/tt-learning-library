import { expect, test } from 'bun:test'
import { facebookEmbedUrl } from '../apps/web/src/components/FacebookEmbed'

test('builds the official Facebook video plugin URL for public videos', () => {
  const source = 'https://www.facebook.com/watch/?v=123456789012345'
  const result = facebookEmbedUrl(source)
  expect(result).not.toBeNull()
  const embed = new URL(result!)
  expect(embed.origin + embed.pathname).toBe('https://www.facebook.com/plugins/video.php')
  expect(embed.searchParams.get('href')).toBe(source)
  expect(embed.searchParams.get('show_text')).toBe('false')
})

test('uses the video plugin for Reels and share-video links', () => {
  expect(new URL(facebookEmbedUrl('https://www.facebook.com/reel/123456789012345')!).pathname).toBe('/plugins/video.php')
  expect(new URL(facebookEmbedUrl('https://www.facebook.com/share/v/AbCdEf')!).pathname).toBe('/plugins/video.php')
  expect(new URL(facebookEmbedUrl('https://fb.watch/AbCdEf')!).pathname).toBe('/plugins/video.php')
})

test('falls back to the post plugin for other public Facebook posts', () => {
  const embed = new URL(facebookEmbedUrl('https://www.facebook.com/tabletennis/posts/123456789012345')!)
  expect(embed.pathname).toBe('/plugins/post.php')
  expect(embed.searchParams.get('show_text')).toBe('true')
})

test('rejects non-Facebook and non-http URLs', () => {
  expect(facebookEmbedUrl('https://example.com/watch?v=123')).toBeNull()
  expect(facebookEmbedUrl('javascript:alert(1)')).toBeNull()
  expect(facebookEmbedUrl(null)).toBeNull()
})
