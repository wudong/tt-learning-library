import { useState } from 'react'
import { ChevronRight, CirclePlus, Dumbbell, Layers3, Network, NotebookPen, Pin, PinOff, Play, Target } from 'lucide-react'
import { toast } from 'sonner'
import { NodeNoteComposer } from '../../components/NodeNoteComposer'
import { PictureAttachments } from '../../components/PictureAttachments'
import { VideoThumbnail } from '../../components/VideoThumbnail'
import { useAttachLibraryVideo, useLibraryNodeResources, useSetLibraryPin, useVideos } from '../../lib/api/hooks'

export function LibraryNodeDetail({ nodeId, type, navigate }: { nodeId:string; type:'topic'|'skill'; navigate:(to:string)=>void }) {
  const resources = useLibraryNodeResources(nodeId)
  const videos = useVideos()
  const attach = useAttachLibraryVideo(nodeId)
  const pin = useSetLibraryPin(nodeId)
  const [choosingVideo, setChoosingVideo] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const linkedIds = new Set(resources.data?.videos.map((video) => video.id) ?? [])

  async function attachVideo(videoId: string) {
    try { await attach.mutateAsync(videoId); toast.success('Video attached') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not attach video') }
  }

  return <section className="library-detail-page">
    {resources.isLoading && <div className="library-skeleton">Loading {type}…</div>}
    {resources.isError && <div className="notice">This {type} could not be loaded.</div>}
    {resources.data && <>
      <header className="library-detail-hero">
        <div className="ontology-symbol">{type === 'topic' ? <Layers3 size={22}/> : <Target size={22}/>}</div>
        <div className="library-detail-title"><span className="eyebrow">{type}</span><h1>{resources.data.node.title}</h1>{resources.data.node.summary && <p>{resources.data.node.summary}</p>}</div>
      </header>

      <div className="detail-action-bar" aria-label={`${resources.data.node.title} actions`}>
        <button className="button secondary" onClick={() => navigate(`/library/connections/${nodeId}`)}><Network size={16}/> Explore connections</button>
        <button className="button secondary" onClick={() => setNoteOpen(true)}><NotebookPen size={16}/> Add note</button>
        <button className="button secondary detail-pin" disabled={pin.isPending} onClick={() => pin.mutate(!resources.data.isPinned)}>{resources.data.isPinned ? <><PinOff size={16}/> Unpin</> : <><Pin size={16}/> Pin to top</>}</button>
      </div>

      <div className="library-detail-grid">
        <article className="card"><PictureAttachments parentNodeId={nodeId}/></article>

        {type === 'topic' && <section className="detail-section relationship-section" aria-labelledby="topic-skills-title">
          <h2 id="topic-skills-title">Skills in this Topic</h2>
          {resources.data.skills.length ? <div className="detail-link-list">{resources.data.skills.map((skill) =>
            <button key={skill.id} onClick={() => navigate(`/library/skills/${skill.id}`)}><Target size={18}/><span><strong>{skill.title}</strong></span><ChevronRight size={18} aria-hidden="true"/></button>
          )}</div> : <p className="muted">No ontology Skills are attached to this Topic.</p>}
        </section>}

        {type === 'skill' && resources.data.drills.length > 0 && <section className="detail-section relationship-section" aria-labelledby="skill-drills-title">
          <h2 id="skill-drills-title">Drills</h2>
          <div className="detail-link-list">{resources.data.drills.map((drill) => <button key={drill.id} onClick={() => navigate(`/library/drills/${drill.nodeId}`)}>{drill.diagramUrl ? <img className="drill-link-image" src={drill.diagramUrl} alt=""/> : <Dumbbell size={18}/>}<span><strong>{drill.title}</strong><small>{drill.description || `${drill.isSystem ? 'Starter drill' : 'Personal idea'} · ${drill.status.replaceAll('_', ' ')}`}</small></span><ChevronRight size={18} aria-hidden="true"/></button>)}</div>
        </section>}

        {type === 'skill' && <article className="card">
          <div className="picture-heading"><div><h2>Videos</h2><p>Learning resources connected to this Skill.</p></div><button className="button secondary" onClick={() => setChoosingVideo((value) => !value)}><Play size={16}/> Attach existing</button></div>
          {resources.data.videos.length ? <div className="resource-videos">{resources.data.videos.map((video) =>
            <button className="resource-video" key={video.id} onClick={() => navigate(`/videos/${video.id}`)}><VideoThumbnail src={video.thumbnailUrl} title={video.title || video.sourceUrl} compact/><span>{video.title || video.sourceUrl}<small>{video.creatorName || video.sourcePlatform}</small></span><Play size={17}/></button>
          )}</div> : <p className="muted">No tutorial videos are attached yet.</p>}
          {choosingVideo && <div className="resource-picker"><h3>Choose from saved videos</h3>{videos.data?.filter((video) => !linkedIds.has(video.id)).slice(0, 20).map((video) =>
            <button className="resource-link" key={video.id} disabled={attach.isPending} onClick={() => attachVideo(video.id)}>{video.title || video.sourceUrl}<small>Attach</small></button>
          )}{videos.data?.every((video) => linkedIds.has(video.id)) && <p className="muted">All saved videos are already attached.</p>}</div>}
          <button className="button detail-add-video" onClick={() => navigate('/videos/new')}><CirclePlus size={17}/> Add a new video</button>
        </article>}
      </div>
      {noteOpen && <NodeNoteComposer target={{ nodeId, title: resources.data.node.title, type }} onClose={() => setNoteOpen(false)} />}
    </>}
  </section>
}
