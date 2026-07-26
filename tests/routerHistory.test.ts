import { describe, expect, test } from 'bun:test'
import { previousRouteWithin } from '../apps/web/src/app/router'

describe('route history scoping', () => {
  test('returns the previous nested Library route', () => {
    expect(previousRouteWithin({
      ttLearnRoute: { from: '/library/topics/topic_1?view=pictures' },
    }, '/library')).toBe('/library/topics/topic_1?view=pictures')
  })

  test('returns the Library root', () => {
    expect(previousRouteWithin({
      ttLearnRoute: { from: '/library' },
    }, '/library')).toBe('/library')
  })

  test('rejects routes outside Library', () => {
    expect(previousRouteWithin({
      ttLearnRoute: { from: '/search?q=serve' },
    }, '/library')).toBeNull()
  })

  test('uses a boundary-safe scope check', () => {
    expect(previousRouteWithin({
      ttLearnRoute: { from: '/library-other/page' },
    }, '/library')).toBeNull()
  })

  test('rejects malformed and absent history state', () => {
    expect(previousRouteWithin(null, '/library')).toBeNull()
    expect(previousRouteWithin({ ttLearnRoute: { from: 42 } }, '/library')).toBeNull()
  })
})
