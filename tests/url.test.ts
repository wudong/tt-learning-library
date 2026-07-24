import { expect, test } from 'bun:test'
import { canonicalizeUrl, detectProvider, extractLikelyUrl } from '../packages/db/src'

test('detects YouTube boundary-safely', () => {
  expect(detectProvider('youtube.com')).toBe('youtube')
  expect(detectProvider('m.youtube.com')).toBe('youtube')
  expect(detectProvider('notyoutube.com')).toBe('other')
})

test('canonicalizes YouTube variants', () => {
  expect(canonicalizeUrl('https://youtu.be/abc123?utm_source=x').canonicalUrl).toBe('https://www.youtube.com/watch?v=abc123')
  expect(canonicalizeUrl('https://www.youtube.com/watch?v=abc123&fbclid=no').externalId).toBe('abc123')
})

test('extracts url from shared text', () => {
  expect(extractLikelyUrl({ text: 'watch https://example.com/a?utm_source=x' })).toContain('https://example.com/a')
})
