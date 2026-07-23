import { expect, test } from 'bun:test'
import { parseAuthHandoffUrl } from '../apps/web/src/lib/auth/authHandoff'

test('parses a same-origin auth handoff without exposing it to the request URL', () => {
  expect(parseAuthHandoffUrl(
    'https://tt-learning.onrender.com/#access_token=access&refresh_token=refresh&type=magiclink',
    'https://tt-learning.onrender.com',
  )).toEqual({ accessToken: 'access', refreshToken: 'refresh' })
})

test('rejects foreign, incomplete, and malformed auth handoffs', () => {
  expect(() => parseAuthHandoffUrl('https://evil.example/#access_token=a&refresh_token=r', 'https://tt-learning.onrender.com')).toThrow('not for TT Learn')
  expect(() => parseAuthHandoffUrl('https://tt-learning.onrender.com/#access_token=a', 'https://tt-learning.onrender.com')).toThrow('incomplete or expired')
  expect(() => parseAuthHandoffUrl('not a link', 'https://tt-learning.onrender.com')).toThrow('complete TT Learn sign-in link')
})
