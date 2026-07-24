import { expect, test } from 'bun:test'
import { validateFeedbackAttachments } from '../apps/api/src/routes/feedback'

function feedbackForm() {
  const form = new FormData()
  form.set('message_type', 'bug')
  form.set('message', 'The mobile header is clipped.')
  return form
}

test('feedback accepts up to three supported screenshots', () => {
  const form = feedbackForm()
  form.append('attachments', new File([new Uint8Array([1])], 'first.png', { type: 'image/png' }))
  form.append('attachments', new File([new Uint8Array([2])], 'second.jpg', { type: 'image/jpeg' }))
  form.append('attachments', new File([new Uint8Array([3])], 'third.webp', { type: 'image/webp' }))
  expect(validateFeedbackAttachments(form)).toBeNull()
})

test('feedback rejects too many screenshots', () => {
  const form = feedbackForm()
  for (let index = 0; index < 4; index += 1) {
    form.append('attachments', new File([new Uint8Array([index])], `${index}.png`, { type: 'image/png' }))
  }
  expect(validateFeedbackAttachments(form)).toBe('Attach at most 3 screenshots.')
})

test('feedback rejects unsupported and oversized attachments', () => {
  const unsupported = feedbackForm()
  unsupported.append('attachments', new File(['notes'], 'notes.txt', { type: 'text/plain' }))
  expect(validateFeedbackAttachments(unsupported)).toBe('Screenshots must be PNG, JPEG, or WebP images.')

  const oversized = feedbackForm()
  oversized.append('attachments', new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }))
  expect(validateFeedbackAttachments(oversized)).toBe('Each screenshot must be 5 MB or smaller.')
})
