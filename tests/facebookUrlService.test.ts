import { expect, test } from 'bun:test'
import { FacebookUrlService } from '../apps/api/src/services/facebookUrlService'

test('follows only Facebook redirects and returns the resolved public video URL', async () => {
  const requests: string[] = []
  const service = new FacebookUrlService(async (input, init) => {
    const url = input.toString()
    requests.push(url)
    expect(init?.redirect).toBe('manual')
    if (url === 'https://fb.watch/short') {
      return new Response(null, { status: 302, headers: { location: 'https://www.facebook.com/share/v/AbCdEf/' } })
    }
    return new Response(null, { status: 302, headers: { location: 'https://www.facebook.com/watch/?v=123456789012345' } })
  })

  expect(await service.resolve('https://fb.watch/short')).toBe('https://www.facebook.com/watch/?v=123456789012345')
  expect(requests).toEqual(['https://fb.watch/short', 'https://www.facebook.com/share/v/AbCdEf/'])
})

test('unwraps Facebook redirect links without requesting arbitrary targets', async () => {
  let called = false
  const service = new FacebookUrlService(async () => {
    called = true
    return new Response(null, { status: 200 })
  })
  const target = 'https://www.facebook.com/watch/?v=123456789012345'
  const wrapped = `https://l.facebook.com/l.php?u=${encodeURIComponent(target)}`
  expect(await service.resolve(wrapped)).toBe(target)
  expect(called).toBe(false)
})

test('does not follow redirects outside the Facebook host allowlist', async () => {
  const service = new FacebookUrlService(async () => new Response(null, {
    status: 302,
    headers: { location: 'https://example.com/not-facebook' },
  }))
  expect(await service.resolve('https://fb.watch/short')).toBe('https://fb.watch/short')
})

test('does not fetch direct Facebook URLs and preserves failures', async () => {
  let directCalled = false
  const direct = new FacebookUrlService(async () => {
    directCalled = true
    return new Response(null, { status: 200 })
  })
  const directUrl = 'https://www.facebook.com/watch/?v=123456789012345'
  expect(await direct.resolve(directUrl)).toBe(directUrl)
  expect(directCalled).toBe(false)

  const failed = new FacebookUrlService(async () => { throw new Error('offline') })
  expect(await failed.resolve('https://fb.watch/short')).toBe('https://fb.watch/short')
})
