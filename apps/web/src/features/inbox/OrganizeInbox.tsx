import { useState } from 'react'
import { toast } from 'sonner'
import { FacebookEmbed } from '../../components/FacebookEmbed'
import { VideoThumbnail } from '../../components/VideoThumbnail'
import { useConvertInbox, useDeleteInbox, useInboxItem } from '../../lib/api/hooks'

export function OrganizeInbox({ id, navigate, quick=false }: { id:string; navigate:(to:string)=>void; quick?: boolean }) {
  const item = useInboxItem(id)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const convert = useConvertInbox(id)
  const remove = useDeleteInbox(id)

  async function submit() {
    try {
      const result = await convert.mutateAsync({
        title: title || item.data?.sharedTitle || undefined,
        quickNote: note || undefined,
        topicIds: [],
        skillIds: [],
        tagIds: [],
      })
      toast.success(result.alreadyConverted ? 'Already organized' : 'Saved as Video')
      navigate(`/videos/${result.video.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not convert')
    }
  }

  async function discard() {
    if (!window.confirm('Discard this Inbox item? This cannot be undone.')) return
    try {
      await remove.mutateAsync()
      toast.success('Inbox item discarded')
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not discard item')
    }
  }

  const data = item.data
  const displayTitle = data?.sharedTitle || 'Shared video'
  const isFacebook = data?.sourcePlatform === 'facebook'

  return (
    <section>
      <h1>{quick ? 'Saved to Inbox' : 'Organize Capture'}</h1>
      {item.isLoading && <div className="card">Loading…</div>}
      {data && <>
        <div className="card">
          {isFacebook
            ? <FacebookEmbed sourceUrl={data.canonicalUrl ?? data.sourceUrl} title={displayTitle} />
            : <VideoThumbnail src={data.thumbnailUrl} title={displayTitle} />}
          <span className="pill">{data.sourcePlatform}</span>
          <h2>{displayTitle}</h2>
          {data.creatorName && <p className="muted">By {data.creatorName}</p>}
          <p className="muted">{data.sourceUrl || 'Needs URL correction before a Video can be created.'}</p>
          {isFacebook && <p className="notice">Public Facebook videos and posts can be played here when Facebook permits embedding. The original link remains available as a fallback.</p>}
          {quick && <div className="quick-actions">
            <button className="button secondary" onClick={() => navigate('/')}>Done</button>
            <button className="button danger" disabled={remove.isPending} onClick={discard}>{remove.isPending ? 'Discarding…' : 'Discard Capture'}</button>
          </div>}
        </div>
        <div className="card stack">
          <label>Video title<input className="input" value={title} placeholder={data.sharedTitle ?? 'Title'} onChange={(event) => setTitle(event.currentTarget.value)}/></label>
          <label>Quick note<textarea rows={4} value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder="Why is this useful?"/></label>
          <button className="button" onClick={submit} disabled={convert.isPending || !data.sourceUrl}>Save as Video</button>
        </div>
      </>}
    </section>
  )
}
