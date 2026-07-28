import { useState } from 'react'
import { CirclePlus, ImagePlus, Images, Layers3, NotebookPen, Pin, PinOff, Play, Target } from 'lucide-react'
import { toast } from 'sonner'
import { NodeNoteComposer } from '../../components/NodeNoteComposer'
import { PictureGallery } from '../../components/PictureGallery'
import { VideoThumbnail } from '../../components/VideoThumbnail'
import { usePageTitle } from '../../components/MobilePageActions'
import { useAttachLibraryVideo, useAttachments, useLibraryNodeResources, useSetLibraryPin, useVideos } from '../../lib/api/hooks'
import { KnowledgeGraphExplorer } from './KnowledgeGraphExplorer'

export function LibraryNodeDetail({ nodeId, type, navigate }: { nodeId:string; type:'topic'|'skill'; navigate:(to:string)=>void }) {
  const resources = useLibraryNodeResources(nodeId)
  const pictures = useAttachments(type === 'topic' ? nodeId : '')
  const videos = useVideos()
  const attach = useAttachLibraryVideo(nodeId)
  const pin = useSetLibraryPin(nodeId)
  const [choosingVideo, setChoosingVideo] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const linkedIds = new Set(resources.data?.videos.map((video) => video.id) ?? [])
  usePageTitle(resources.data?.node.title ?? null, {
    eyebrow: type === 'topic' ? 'Topic' : 'Skill',
    icon: type === 'topic' ? <Layers3 size={13} aria-hidden="true" /> : <Target size={13} aria-hidden="true" />,
  })

  async function attachVideo(videoId: string) {
    try { await attach.mutateAsync(videoId); toast.success('Video attached') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not attach video') }
  }

  return <section className="library-detail-page">
    {resources.isLoading && <div className="library-skeleton">Loading {type}…</div>}
    {resources.isError && <div className="notice">This {type} could not be loaded.</div>}
    {resources.data && <>
      <header className="library-detail-hero">
        <div className="ontology-symbol detail-title-only">{type === 'topic' ? <Layers3 size={22} /> : <Target size={22} />}</div>
        <div className="library-detail-title"><span className="eyebrow detail-title-only">{type}</span><h1 className="detail-title-only">{resources.data.node.title}</h1></div>
      </header>

      <div className="detail-action-bar" aria-label={`${resources.data.node.title} actions`}>
        <button className="button secondary" onClick={() => setNoteOpen(true)}><NotebookPen size={16} /> Add note</button>
        {type === 'topic' && <button className="button secondary" onClick={() => navigate(`/library/topics/${nodeId}/pictures`)}>{pictures.data?.length ? <Images size={16} /> : <ImagePlus size={16} />} {pictures.data?.length ? 'Manage pictures' : 'Add picture'}</button>}
        <button className="button secondary detail-pin" disabled={pin.isPending} onClick={() => pin.mutate(!resources.data.isPinned)}>{resources.data.isPinned ? <><PinOff size={16} /> Unpin</> : <><Pin size={16} /> Pin to top</>}</button>
      </div>

      <KnowledgeGraphExplorer nodeId={nodeId} navigate={navigate} embedded />

      <div className="library-detail-grid">
        {type === 'topic' && pictures.data && pictures.data.length > 0 && <section className="detail-section topic-picture-section" aria-labelledby="topic-pictures-title">
          <div className="picture-heading"><div><h2 id="topic-pictures-title">Pictures</h2><p>Visual references attached to this Topic.</p></div></div>
          <PictureGallery pictures={pictures.data} />
        </section>}

        {type === 'skill' && <section className="detail-section relationship-section" aria-labelledby="skill-notes-title">
          <div className="picture-heading"><div><h2 id="skill-notes-title">Notes</h2><p>Your takeaways, questions, and reminders for this Skill.</p></div></div>
          {resources.data.notes.length ? <div className="skill-note-list">{resources.data.notes.map((note) => <article key={note.id}>
            <span>{note.noteType.replaceAll('_', ' ')}</span><p>{note.body}</p>
          </article>)}</div> : <p className="muted">No notes yet. Use Add note above to keep a takeaway or question with this Skill.</p>}
        </section>}

        {type === 'skill' && <article className="card">
          <div className="picture-heading"><div><h2>Videos</h2><p>Learning resources connected to this Skill.</p></div><button className="button secondary" onClick={() => setChoosingVideo((value) => !value)}><Play size={16} /> Attach existing</button></div>
          {resources.data.videos.length ? <div className="resource-videos">{resources.data.videos.map((video) =>
            <button className="resource-video" key={video.id} onClick={() => navigate(`/videos/${video.id}`)}><VideoThumbnail src={video.thumbnailUrl} title={video.title || video.sourceUrl} compact /><span>{video.title || video.sourceUrl}<small>{video.creatorName || video.sourcePlatform}</small></span><Play size={17} /></button>
          )}</div> : <p className="muted">No tutorial videos are attached yet.</p>}
          {choosingVideo && <div className="resource-picker"><h3>Choose from saved videos</h3>{videos.data?.filter((video) => !linkedIds.has(video.id)).slice(0, 20).map((video) =>
            <button className="resource-link" key={video.id} disabled={attach.isPending} onClick={() => attachVideo(video.id)}>{video.title || video.sourceUrl}<small>Attach</small></button>
          )}{videos.data?.every((video) => linkedIds.has(video.id)) && <p className="muted">All saved videos are already attached.</p>}</div>}
          <button className="button detail-add-video" onClick={() => navigate('/videos/new')}><CirclePlus size={17} /> Add a new video</button>
        </article>}
      </div>
      {noteOpen && <NodeNoteComposer target={{ nodeId, title: resources.data.node.title, type }} onClose={() => setNoteOpen(false)} />}
    </>}
  </section>
}
