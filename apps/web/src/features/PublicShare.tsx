import { useEffect, useState } from 'react'
import { PublicShareResponseSchema } from '@ttll/shared'
import { FacebookEmbed } from '../components/FacebookEmbed'

 type PublicVideo = {
  sourceUrl: string
  canonicalUrl: string | null
  sourcePlatform: string
  title: string | null
}

type PublicShareData = {
  nodeType: string
  title: string
  summary: string | null
  video: PublicVideo | null
}

function readPublicVideo(projection: Record<string, unknown>): PublicVideo | null {
  const value = projection.video
  if (!value || typeof value !== 'object') return null
  const video = value as Record<string, unknown>
  if (typeof video.sourceUrl !== 'string' || typeof video.sourcePlatform !== 'string') return null
  return {
    sourceUrl: video.sourceUrl,
    canonicalUrl: typeof video.canonicalUrl === 'string' ? video.canonicalUrl : null,
    sourcePlatform: video.sourcePlatform,
    title: typeof video.title === 'string' ? video.title : null,
  }
}

export function PublicShare({ token }: { token: string }) {
  const [data, setData] = useState<PublicShareData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setData(null)
    setError(null)

    fetch(`/api/public/share/${encodeURIComponent(token)}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(response.status === 404 ? 'This shared item is unavailable.' : 'Could not load this shared item.')
        return PublicShareResponseSchema.parse(payload).data
      })
      .then((share) => setData({
        nodeType: share.nodeType,
        title: share.title,
        summary: share.summary,
        video: readPublicVideo(share.projection),
      }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(reason instanceof Error ? reason.message : 'Could not load this shared item.')
      })

    return () => controller.abort()
  }, [token])

  return (
    <main className="login-page">
      <article className="login-card">
        <a href="/">Table Tennis Learning Library</a>
        {!data && !error && <p className="muted">Loading shared item…</p>}
        {error && <><h1>Share unavailable</h1><p>{error}</p></>}
        {data && <>
          {data.video?.sourcePlatform === 'facebook' && <FacebookEmbed sourceUrl={data.video.canonicalUrl ?? data.video.sourceUrl} title={data.video.title ?? data.title} />}
          <span className="pill">{data.nodeType.replaceAll('_', ' ')}</span>
          <h1>{data.title}</h1>
          {data.summary ? <p>{data.summary}</p> : <p className="muted">No description was included with this shared item.</p>}
        </>}
      </article>
    </main>
  )
}
