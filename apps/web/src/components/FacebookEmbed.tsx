import { useEffect, useState } from 'react'
import './FacebookEmbed.css'

function isFacebookHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  return host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch'
}

function isVideoLikeUrl(url: URL): boolean {
  const path = url.pathname.toLowerCase()
  return url.hostname.toLowerCase() === 'fb.watch'
    || path === '/watch'
    || path.startsWith('/watch/')
    || path.includes('/videos/')
    || path.includes('/reel/')
    || /^\/share\/(?:v|r)\//.test(path)
    || url.searchParams.has('v')
    || url.searchParams.has('video_id')
}

export function facebookEmbedUrl(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null
  try {
    const contentUrl = new URL(sourceUrl)
    if (!['http:', 'https:'].includes(contentUrl.protocol) || !isFacebookHost(contentUrl.hostname)) return null
    contentUrl.protocol = 'https:'
    const videoLike = isVideoLikeUrl(contentUrl)
    const endpoint = new URL(videoLike
      ? 'https://www.facebook.com/plugins/video.php'
      : 'https://www.facebook.com/plugins/post.php')
    endpoint.searchParams.set('href', contentUrl.toString())
    endpoint.searchParams.set('width', '560')
    endpoint.searchParams.set('show_text', videoLike ? 'false' : 'true')
    return endpoint.toString()
  } catch {
    return null
  }
}

export function FacebookEmbed({ sourceUrl, title }: { sourceUrl: string | null; title: string }) {
  const [loaded, setLoaded] = useState(false)
  const src = facebookEmbedUrl(sourceUrl)
  useEffect(() => setLoaded(false), [sourceUrl])
  if (!src || !sourceUrl) return null

  if (!loaded) {
    return (
      <div className="facebook-embed-gate">
        <span className="facebook-mark" aria-hidden="true">f</span>
        <div className="facebook-embed-copy">
          <strong>Public Facebook video</strong>
          <p>Load the Facebook player to see its preview and watch it here. Facebook may use cookies when the player loads.</p>
        </div>
        <div className="facebook-embed-actions">
          <button className="button" type="button" onClick={() => setLoaded(true)}>Load Facebook player</button>
          <a className="button secondary" href={sourceUrl} target="_blank" rel="noreferrer">Open in Facebook</a>
        </div>
      </div>
    )
  }

  return (
    <div className="facebook-embed-loaded">
      <div className="video-embed facebook-video-embed">
        <iframe
          src={src}
          title={`Facebook video player: ${title}`}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a className="button secondary facebook-open-link" href={sourceUrl} target="_blank" rel="noreferrer">Open in Facebook</a>
    </div>
  )
}
