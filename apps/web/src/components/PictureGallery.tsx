import { useEffect, useState } from 'react'
import { useAttachmentBlob } from '../lib/api/hooks'

export function PictureGallery({ pictures }: { pictures: Array<{ id: string; fileName: string }> }) {
  return <div className="picture-gallery-readonly" aria-label={`${pictures.length} attached ${pictures.length === 1 ? 'picture' : 'pictures'}`}>
    {pictures.map((picture) => <ReadOnlyPicture key={picture.id} id={picture.id} name={picture.fileName} />)}
  </div>
}

function ReadOnlyPicture({ id, name }: { id: string; name: string }) {
  const content = useAttachmentBlob(id)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!content.data) return
    const next = URL.createObjectURL(content.data)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [content.data])

  return <figure className="picture-gallery-item">
    {url ? <img src={url} alt={name} /> : <div className="picture-loading">Loading…</div>}
  </figure>
}
