import { useState } from 'react'
import type { FeedbackType } from '@ttll/shared'

export type { FeedbackType }

export const MAX_FEEDBACK_SCREENSHOTS = 3
export const MAX_FEEDBACK_SCREENSHOT_BYTES = 5 * 1024 * 1024
export const MAX_FEEDBACK_SCREENSHOTS_TOTAL_BYTES = 10 * 1024 * 1024
const FEEDBACK_SCREENSHOT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface FeedbackPayload {
  name?: string | null
  email?: string | null
  message_type: FeedbackType
  message: string
  page_path?: string | null
  page_title?: string | null
  metadata?: Record<string, unknown> | null
  screenshots?: File[]
  /** Honeypot — must be empty for real users. */
  website?: string | null
}

export function validateFeedbackScreenshots(files: readonly File[]): string | null {
  if (files.length > MAX_FEEDBACK_SCREENSHOTS) return `Attach at most ${MAX_FEEDBACK_SCREENSHOTS} screenshots.`
  let totalBytes = 0
  for (const file of files) {
    if (!FEEDBACK_SCREENSHOT_TYPES.has(file.type)) return 'Screenshots must be PNG, JPEG, or WebP images.'
    if (!file.size) return 'Screenshot files cannot be empty.'
    if (file.size > MAX_FEEDBACK_SCREENSHOT_BYTES) return 'Each screenshot must be 5 MB or smaller.'
    totalBytes += file.size
  }
  if (totalBytes > MAX_FEEDBACK_SCREENSHOTS_TOTAL_BYTES) return 'Screenshot attachments must total 10 MB or less.'
  return null
}

/** Client context sent as metadata for richer triage. */
function captureMetadata(): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  const m: Record<string, unknown> = {
    url: window.location.href,
    locale: navigator.language,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
  }
  const version = import.meta.env.VITE_APP_VERSION
  if (version) m.appVersion = version
  return m
}

export function useSubmitFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const submit = async (payload: FeedbackPayload): Promise<boolean> => {
    const message = payload.message.trim()
    if (message.length < 3) {
      setSubmitError('Please enter a message containing at least 3 characters.')
      return false
    }
    const screenshots = payload.screenshots ?? []
    const screenshotError = validateFeedbackScreenshots(screenshots)
    if (screenshotError) {
      setSubmitError(screenshotError)
      return false
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const metadata = payload.metadata ?? captureMetadata()
      let endpoint = '/api/feedback'
      let body: BodyInit
      let headers: HeadersInit | undefined = { 'Content-Type': 'application/json' }

      if (screenshots.length) {
        endpoint = '/api/feedback/multipart'
        const form = new FormData()
        form.set('name', payload.name?.trim() || '')
        form.set('email', payload.email?.trim() || '')
        form.set('message_type', payload.message_type)
        form.set('message', message)
        form.set('page_path', payload.page_path?.trim() || '')
        form.set('page_title', payload.page_title?.trim() || '')
        form.set('metadata', JSON.stringify(metadata))
        form.set('website', payload.website ?? '')
        for (const screenshot of screenshots) form.append('attachments', screenshot, screenshot.name)
        body = form
        headers = undefined
      } else {
        body = JSON.stringify({
          name: payload.name?.trim() || null,
          email: payload.email?.trim() || null,
          message_type: payload.message_type,
          message,
          page_path: payload.page_path?.trim() || null,
          page_title: payload.page_title?.trim() || null,
          metadata,
          website: payload.website ?? '',
        })
      }

      const res = await fetch(endpoint, { method: 'POST', headers, body })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `HTTP ${res.status}`)
      }
      setSubmitSuccess(true)
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to send feedback.'
      setSubmitError(msg.includes('Too many') ? 'You are sending feedback too fast — try again in a minute.' : msg)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const reset = () => {
    setSubmitError(null)
    setSubmitSuccess(false)
  }

  return { isSubmitting, submitError, submitSuccess, submit, reset }
}
