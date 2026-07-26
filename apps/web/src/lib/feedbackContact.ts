const FEEDBACK_CONTACT_EMAIL_KEY = 'tt-learn:feedback-contact-email'

type FeedbackContactStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

function browserStorage(): FeedbackContactStorage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadFeedbackContactEmail(storage = browserStorage()): string {
  if (!storage) return ''
  try {
    return storage.getItem(FEEDBACK_CONTACT_EMAIL_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function saveFeedbackContactEmail(email: string, storage = browserStorage()): void {
  if (!storage) return
  const normalized = email.trim()
  try {
    if (normalized) storage.setItem(FEEDBACK_CONTACT_EMAIL_KEY, normalized)
    else storage.removeItem(FEEDBACK_CONTACT_EMAIL_KEY)
  } catch {
    // Feedback remains usable when storage is unavailable or full.
  }
}
