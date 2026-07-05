import { useState } from 'react'
import type { FeedbackType } from '@ttll/shared'

export type { FeedbackType }

export interface FeedbackPayload {
  name?: string | null
  email?: string | null
  message_type: FeedbackType
  message: string
  page_path?: string | null
  page_title?: string | null
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
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name?.trim() || null,
          email: payload.email?.trim() || null,
          message_type: payload.message_type,
          message,
          page_path: payload.page_path?.trim() || null,
          page_title: payload.page_title?.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `HTTP ${res.status}`)
      }
      setSubmitSuccess(true)
      return true
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to send feedback.')
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
