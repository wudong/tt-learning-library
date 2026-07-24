import { expect, test } from 'bun:test'
import { canonicalizeUrl, detectProvider, extractLikelyUrl } from '../packages/db/src'

test('detects supported providers boundary-safely', () => {
  expect(detectProvider('youtube.com')).toBe('youtube')
  expect(detectProvider('m.youtube.com')).toBe('youtube')
  expect(detectProvider('notyoutube.com')).toBe('other')
  expect(detectProvider('facebook.com')).toBe('facebook')
  expect(detectProvider('m.facebook.com')).toBe('facebook')
  expect(detectProvider('fb.watch')).toBe('facebook')
  expect(detectProvider('notfacebook.com')).toBe('other')
})

test('canonicalizes YouTube variants', () => {
  expect(canonicalizeUrl('https://youtu.be/abc123?utm_source=x').canonicalUrl).toBe('https://www.youtube.com/watch?v=abc123')
  expect(canonicalizeUrl('https://www.youtube.com/watch?v=abc123&fbclid=no').externalId).toBe('abc123')
})

test('canonicalizes public Facebook video and Reel variants', () => {
  const video = canonicalizeUrl('https://m.facebook.com/coach/videos/123456789012345/?fbclid=no&mibextid=x')
  expect(video).toMatchObject({
    sourcePlatform: 'facebook',
    externalId: '123456789012345',
    canonicalUrl: 'https://www.facebook.com/watch/?v=123456789012345',
  })

  const watch = canonicalizeUrl('https://www.facebook.com/watch/?video_id=987654321098765')
  expect(watch.canonicalUrl).toBe('https://www.facebook.com/watch/?v=987654321098765')
  expect(watch.externalId).toBe('987654321098765')

  const reel = canonicalizeUrl('https://www.facebook.com/reel/456789012345678/?mibextid=share')
  expect(reel.canonicalUrl).toBe('https://www.facebook.com/reel/456789012345678')
  expect(reel.externalId).toBe('456789012345678')
})

test('keeps unresolved Facebook share URLs usable while removing tracking', () => {
  const identity = canonicalizeUrl('https://m.facebook.com/share/v/AbCdEf/?mibextid=abc&utm_source=x')
  expect(identity.canonicalUrl).toBe('https://www.facebook.com/share/v/AbCdEf')
  expect(identity.externalId).toBeNull()
})

test('extracts url from shared text', () => {
  expect(extractLikelyUrl({ text: 'watch https://example.com/a?utm_source=x' })).toContain('https://example.com/a')
})
