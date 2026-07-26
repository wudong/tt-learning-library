import { describe, expect, test } from 'bun:test'
import { loadFeedbackContactEmail, saveFeedbackContactEmail } from '../apps/web/src/lib/feedbackContact'

function memoryStorage(initial?: string) {
  const values = new Map<string, string>()
  if (initial) values.set('tt-learn:feedback-contact-email', initial)
  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
    removeItem(key: string) {
      values.delete(key)
    },
  }
}

describe('remembered feedback contact email', () => {
  test('loads and normalizes a saved address', () => {
    expect(loadFeedbackContactEmail(memoryStorage('  player@example.com  '))).toBe('player@example.com')
  })

  test('stores a voluntarily provided address on this device', () => {
    const storage = memoryStorage()
    saveFeedbackContactEmail('  coach@example.com  ', storage)
    expect(loadFeedbackContactEmail(storage)).toBe('coach@example.com')
  })

  test('removes the saved address when the user forgets it', () => {
    const storage = memoryStorage('player@example.com')
    saveFeedbackContactEmail('', storage)
    expect(loadFeedbackContactEmail(storage)).toBe('')
  })

  test('does not break feedback when storage is unavailable', () => {
    const unavailable = {
      getItem() { throw new Error('blocked') },
      setItem() { throw new Error('blocked') },
      removeItem() { throw new Error('blocked') },
    }
    expect(loadFeedbackContactEmail(unavailable)).toBe('')
    expect(() => saveFeedbackContactEmail('player@example.com', unavailable)).not.toThrow()
  })
})
