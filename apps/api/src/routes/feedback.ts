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
 *   POST /api/feedback/multipart   -> upstream POST /feedback/multipart (form + files)
 */

const SERVICE_URL = (process.env.FEEDBACK_SERVICE_URL ?? 'https://feedback.graceliu.uk').replace(/\/+$/, '')
const APP_ID = process.env.FEEDBACK_APP_ID ?? 'tt-learning-library'

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

export function feedbackRoutes() {
  const app = new Hono()

  // JSON text feedback (used by the current UI)
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

  // Multipart feedback with screenshots (for the screenshot-attachment feature).
  // Forwards form fields + files, injecting app_id.
  app.post('/multipart', async (c) => {
    let form: FormData
    try {
      form = await c.req.formData()
    } catch {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Expected multipart/form-data.' } }, 400)
    }

    // Server controls app_id; drop any client-supplied value.
    form.delete('app_id')
    form.append('app_id', APP_ID)

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