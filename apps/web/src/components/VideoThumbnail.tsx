import { useEffect, useState } from 'react'

export function VideoThumbnail({ src, title, compact = false }: { src: string | null; title: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (!src || failed) return null
  return (
    <div className={compact ? 'video-thumbnail compact' : 'video-thumbnail'}>
      <img src={src} alt={`Thumbnail for ${title}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" onError={() => setFailed(true)} />
    </div>
  )
}
