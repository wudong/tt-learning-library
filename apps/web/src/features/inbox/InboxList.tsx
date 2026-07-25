import { Archive, Inbox as InboxIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useInbox, useSetInboxStatus } from '../../lib/api/hooks'
import { VideoThumbnail } from '../../components/VideoThumbnail'

export function InboxList({ navigate }: { navigate: (to: string) => void }) {
  const inbox = useInbox()
  const setStatus = useSetInboxStatus()

  async function archive(item: NonNullable<typeof inbox.data>[number]) {
    try {
      await setStatus.mutateAsync({ id: item.id, status: 'archived' })
      toast.success('Capture archived', {
        action: {
          label: 'Undo',
          onClick: () => {
            void setStatus.mutateAsync({ id: item.id, status: item.status }).then(
              () => toast.success('Capture restored'),
              (error) => toast.error(error instanceof Error ? error.message : 'Could not restore capture'),
            )
          },
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not archive capture')
    }
  }

  return <section>
    <h1 className="desktop-only-heading">Inbox</h1>
    {inbox.isLoading && <div className="card">Loading…</div>}
    {inbox.isError && <div className="notice">We could not load your Inbox. Check your connection and try again.</div>}
    {inbox.data?.length === 0 && <div className="empty"><InboxIcon size={28} /><p>Your Inbox is clear. Share a tutorial into the app or paste a link.</p></div>}
    {inbox.data?.map((item) => {
      const title = item.sharedTitle || item.sourceUrl || 'Capture needs URL correction'
      return <article className="card inbox-card" key={item.id}>
        <VideoThumbnail src={item.thumbnailUrl} title={title} compact />
        <div className="inbox-card-head">
          <div>
            <span className="pill">{item.sourcePlatform}</span>
            <h2>{title}</h2>
            {item.creatorName && <p className="muted">By {item.creatorName}</p>}
            <p className="muted">Captured {new Date(item.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="inbox-card-actions">
          <button className="button" onClick={() => navigate(`/inbox/${item.id}`)}>Organize</button>
          <button className="button secondary" disabled={setStatus.isPending} onClick={() => void archive(item)}><Archive size={17} /> Archive</button>
        </div>
      </article>
    })}
  </section>
}
