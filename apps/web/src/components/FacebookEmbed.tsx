import { useEffect, useState } from 'react'
import './FacebookEmbed.css'

export type FacebookFrame = 'landscape' | 'portrait'

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

export function isFacebookVideoUrl(sourceUrl: string | null): boolean {
  if (!sourceUrl) return false
  try {
    const url = new URL(sourceUrl)
    return ['http:', 'https:'].includes(url.protocol) && isFacebookHost(url.hostname) && isVideoLikeUrl(url)
  } catch {
    return false
  }
}

export function preferredFacebookFrame(sourceUrl: string | null): FacebookFrame {
  if (!sourceUrl) return 'landscape'
  try {
    const path = new URL(sourceUrl).pathname.toLowerCase()
    return path.includes('/reel/') || /^\/share\/r\//.test(path) ? 'portrait' : 'landscape'
  } catch {
    return 'landscape'
  }
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
    endpoint.searchParams.set('adapt_container_width', 'true')
    return endpoint.toString()
  } catch {
    return null
  }
}

export function FacebookEmbed({ sourceUrl, title }: { sourceUrl: string | null; title: string }) {
  const [loaded, setLoaded] = useState(false)
  const [frame, setFrame] = useState<FacebookFrame>(() => preferredFacebookFrame(sourceUrl))
  const src = facebookEmbedUrl(sourceUrl)
  const isVideo = isFacebookVideoUrl(sourceUrl)
  useEffect(() => {
    setLoaded(false)
    setFrame(preferredFacebookFrame(sourceUrl))
  }, [sourceUrl])
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
      {isVideo && <div className="facebook-frame-controls" role="group" aria-label="Facebook video shape">
        <button type="button" className={frame === 'landscape' ? 'active' : ''} aria-pressed={frame === 'landscape'} onClick={() => setFrame('landscape')}>Wide video</button>
        <button type="button" className={frame === 'portrait' ? 'active' : ''} aria-pressed={frame === 'portrait'} onClick={() => setFrame('portrait')}>Tall video</button>
      </div>}
      <div className={`video-embed facebook-video-embed ${isVideo ? frame : 'post'}`}>
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
