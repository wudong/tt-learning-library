import { useEffect, useRef, useState, type ClipboardEvent } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAttachmentBlob, useAttachments, useCreateAttachment, useDeleteAttachment } from '../lib/api/hooks'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

export function PictureAttachments({ parentNodeId }: { parentNodeId: string }) {
  const attachments = useAttachments(parentNodeId)
  const create = useCreateAttachment(parentNodeId)
  const remove = useDeleteAttachment(parentNodeId)
  const input = useRef<HTMLInputElement>(null)
  const [isPasteFocused, setPasteFocused] = useState(false)

  async function add(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) return toast.error('Use a JPEG, PNG, or WebP picture')
    if (!file.size || file.size > MAX_BYTES) return toast.error('Pictures may be at most 5 MB')
    try { await create.mutateAsync(file); toast.success('Picture attached') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not attach picture') }
  }
  function paste(event: ClipboardEvent<HTMLDivElement>) {
    const pictures = [...event.clipboardData.items].filter((item) => item.kind === 'file' && item.type.startsWith('image/')).map((item) => item.getAsFile()).filter((file): file is File => !!file)
    if (!pictures.length) return
    event.preventDefault()
    void Promise.all(pictures.map(add))
  }
  async function discard(id: string) {
    if (!window.confirm('Remove this picture from the knowledge item?')) return
    try { await remove.mutateAsync(id); toast.success('Picture removed') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not remove picture') }
  }

  return <section className="picture-attachments">
    <div className="picture-heading"><div><h3>Pictures</h3><p>Paste a screenshot or attach a picture to this learning item.</p></div>
      <button className="button secondary" onClick={() => input.current?.click()} disabled={create.isPending}><Upload size={16}/> Choose picture</button>
      <input ref={input} className="sr-only" type="file" accept={ACCEPTED_TYPES.join(',')} onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void add(file); event.currentTarget.value = '' }}/>
    </div>
    <div className={isPasteFocused ? 'picture-paste focused' : 'picture-paste'} tabIndex={0} onPaste={paste} onFocus={() => setPasteFocused(true)} onBlur={() => setPasteFocused(false)}>
      <ImagePlus size={22}/><span>Tap here, then paste a copied picture</span><small>JPEG, PNG, or WebP · up to 5 MB</small>
    </div>
    {attachments.isLoading && <p className="muted">Loading pictures…</p>}
    {attachments.data && attachments.data.length > 0 && <div className="picture-grid">{attachments.data.map((attachment) =>
      <Picture key={attachment.id} id={attachment.id} name={attachment.fileName} onRemove={() => discard(attachment.id)} removing={remove.isPending && remove.variables === attachment.id}/>
    )}</div>}
  </section>
}

function Picture({ id, name, onRemove, removing }: { id: string; name: string; onRemove: () => void; removing: boolean }) {
  const content = useAttachmentBlob(id)
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!content.data) return
    const next = URL.createObjectURL(content.data)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [content.data])
  return <figure className="picture-card">
    {url ? <img src={url} alt={name}/> : <div className="picture-loading">Loading…</div>}
    <figcaption><span title={name}>{name}</span><button className="toolbar-icon" aria-label={`Remove ${name}`} disabled={removing} onClick={onRemove}><Trash2 size={16}/></button></figcaption>
  </figure>
}
