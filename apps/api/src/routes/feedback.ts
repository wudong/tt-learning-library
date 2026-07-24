import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateFeedbackRequestSchema } from '@ttll/shared'

/**
 * Feedback proxy.
 *
 * The browser posts to same-origin `/api/feedback`; this route forwards to the
 * standalone feedback service (FEEDBACK_SERVICE_URL), injecting the project's
 * `app_id` (FEEDBACK_APP_ID) server-side so the client never holds the upstream
 * URL or app namespace. The service owns storage + screenshots; we do not write
 * feedback to the local database.
 *
 *   POST /api/feedback            -> upstream POST /feedback          (JSON)
 *   POST /api/feedback/multipart  -> upstream POST /feedback/multipart (form + files)
 */

const SERVICE_URL = (process.env.FEEDBACK_SERVICE_URL ?? 'https://feedback.graceliu.uk').replace(/\/+$/, '')
const APP_ID = process.env.FEEDBACK_APP_ID ?? 'tt-learning-library'

export const FEEDBACK_ATTACHMENT_LIMITS = {
  maxFiles: 3,
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalBytes: 10 * 1024 * 1024,
  allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
} as const

const MAX_MULTIPART_REQUEST_BYTES = FEEDBACK_ATTACHMENT_LIMITS.maxTotalBytes + 256 * 1024
const FEEDBACK_TYPES = new Set(['general', 'bug', 'feature', 'data_accuracy'])

/** Map an upstream error response into the app's canonical error envelope. */
async function upstreamError(res: Response): Promise<{ error: { code: string; message: string; details: unknown } } | null> {
  if (res.ok) return null
  let message = `Feedback service returned HTTP ${res.status}`
  let details: unknown = undefined
  try {
    const body = await res.json()
    if (typeof body?.error === 'string') message = body.error
    else if (body?.error?.message) message = body.error.message
    details = body
  } catch {
    /* non-JSON body */
  }
  const code = res.status === 429 ? 'RATE_LIMITED' : res.status >= 500 ? 'UPSTREAM_ERROR' : 'FEEDBACK_ERROR'
  return { error: { code, message, details } }
}

function textField(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

export function validateFeedbackAttachments(form: FormData): string | null {
  const attachmentValues = [...form.getAll('attachments'), ...form.getAll('attachment')]
  if (attachmentValues.some((value) => !(value instanceof File))) return 'Screenshot attachments must be files.'

  const files = attachmentValues as File[]
  if (files.length > FEEDBACK_ATTACHMENT_LIMITS.maxFiles) return `Attach at most ${FEEDBACK_ATTACHMENT_LIMITS.maxFiles} screenshots.`

  let totalBytes = 0
  for (const file of files) {
    if (!FEEDBACK_ATTACHMENT_LIMITS.allowedTypes.has(file.type)) return 'Screenshots must be PNG, JPEG, or WebP images.'
    if (!file.size) return 'Screenshot files cannot be empty.'
    if (file.size > FEEDBACK_ATTACHMENT_LIMITS.maxFileBytes) return 'Each screenshot must be 5 MB or smaller.'
    totalBytes += file.size
  }
  if (totalBytes > FEEDBACK_ATTACHMENT_LIMITS.maxTotalBytes) return 'Screenshot attachments must total 10 MB or less.'

  const message = textField(form, 'message').trim()
  if (message.length < 3 || message.length > 10_000) return 'Feedback must contain between 3 and 10,000 characters.'
  if (!FEEDBACK_TYPES.has(textField(form, 'message_type'))) return 'Choose a valid feedback type.'
  return null
}

function normalizeAttachmentFields(form: FormData) {
  const singular = form.getAll('attachment')
  form.delete('attachment')
  for (const attachment of singular) form.append('attachments', attachment)
}

export function feedbackRoutes() {
  const app = new Hono()

  // JSON text feedback.
  app.post('/', zValidator('json', CreateFeedbackRequestSchema), async (c) => {
    const body = c.req.valid('json')

    const metadata = {
      ...(body.metadata ?? {}),
      userAgent: c.req.header('user-agent') ?? undefined,
      referer: c.req.header('referer') ?? undefined,
    }

    const upstream = await fetch(`${SERVICE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: APP_ID,
        message: body.message.trim(),
        message_type: body.message_type,
        name: body.name?.trim() || null,
        email: body.email?.trim() || null,
        page_path: body.page_path?.trim() || null,
        page_title: body.page_title?.trim() || null,
        metadata,
        ...(body.website ? { website: body.website } : {}),
      }),
    })

    const err = await upstreamError(upstream)
    if (err) return c.json(err, upstream.status as any)

    // Forward the service's success body ({ success, id }) verbatim.
    const data = await upstream.json()
    return c.json(data, upstream.status as any)
  })

  // Multipart feedback with screenshots. Validate before forwarding and keep
  // app_id server-controlled. The upstream service expects `attachments`.
  app.post('/multipart', async (c) => {
    const contentLength = Number(c.req.header('content-length') ?? 0)
    if (contentLength > MAX_MULTIPART_REQUEST_BYTES) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Screenshot attachments must total 10 MB or less.' } }, 400)
    }

    let form: FormData
    try {
      form = await c.req.formData()
    } catch {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Expected multipart/form-data.' } }, 400)
    }

    const validationError = validateFeedbackAttachments(form)
    if (validationError) return c.json({ error: { code: 'VALIDATION_ERROR', message: validationError } }, 400)

    normalizeAttachmentFields(form)
    form.delete('app_id')
    form.set('app_id', APP_ID)

    const metadata = textField(form, 'metadata')
    if (metadata) {
      try {
        JSON.parse(metadata)
      } catch {
        return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Feedback metadata must be valid JSON.' } }, 400)
      }
    }

    const upstream = await fetch(`${SERVICE_URL}/feedback/multipart`, {
      method: 'POST',
      body: form,
    })

    const err = await upstreamError(upstream)
    if (err) return c.json(err, upstream.status as any)

    const data = await upstream.json()
    return c.json(data, upstream.status as any)
  })

  return app
}
