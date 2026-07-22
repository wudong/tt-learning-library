const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{6,32}$/

export function youtubeEmbedUrl(externalId: string | null): string | null {
  if (!externalId || !YOUTUBE_VIDEO_ID.test(externalId)) return null
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(externalId)}`
}

export function YouTubeEmbed({ externalId, title }: { externalId: string | null; title: string }) {
  const src = youtubeEmbedUrl(externalId)
  if (!src) return null

  return (
    <div className="video-embed">
      <iframe
        src={src}
        title={`YouTube video player: ${title}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}
