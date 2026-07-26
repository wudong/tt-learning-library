import { ChevronRight, Layers3, Network, Target } from 'lucide-react'
import { FacebookEmbed } from '../../components/FacebookEmbed'
import { PictureAttachments } from '../../components/PictureAttachments'
import { VideoThumbnail } from '../../components/VideoThumbnail'
import { YouTubeEmbed } from '../../components/YouTubeEmbed'
import { useVideo } from '../../lib/api/hooks'

export function VideoDetail({ id, navigate }: { id:string; navigate: (to: string) => void }) {
  const video = useVideo(id)
  const data = video.data
  const title = data?.video.title || data?.node.title || 'Video'
  const topics = data?.topics ?? []
  const skills = data?.skills ?? []
  const related = data?.related ?? []
  const skillRelationships = data?.skillRelationships ?? {}

  return (
    <section className="video-detail-page">
      <header className="video-detail-hero detail-title-only">
        <span className="eyebrow">Video</span>
        <h1>{title}</h1>
      </header>

      {video.isLoading && <div className="card">Loading…</div>}
      {video.isError && <div className="notice">This video could not be loaded.</div>}
      {data && <>
        <article className="card video-primary-card">
          {data.video.sourcePlatform === 'youtube' && data.video.externalId
            ? <YouTubeEmbed externalId={data.video.externalId} title={title} />
            : data.video.sourcePlatform === 'facebook'
              ? <FacebookEmbed sourceUrl={data.video.canonicalUrl ?? data.video.sourceUrl} title={title} />
              : <VideoThumbnail src={data.video.thumbnailUrl} title={title} />}
          <span className="pill">{data.video.sourcePlatform}</span>
          {data.video.creatorName && <p className="muted">By {data.video.creatorName}</p>}
          <p className="muted">{data.video.progress} • {data.video.learningState}</p>
          {data.video.sourcePlatform !== 'facebook' && <a className="button" href={data.video.sourceUrl} target="_blank" rel="noreferrer">Open Video</a>}
        </article>

        <div className="detail-action-bar video-detail-actions" aria-label={`${title} actions`}>
          <button className="button secondary" onClick={() => navigate(`/library/connections/${data.node.id}`)}><Network size={16} /> Explore connections</button>
        </div>

        <article className="card"><PictureAttachments parentNodeId={data.node.id}/></article>

        <section className="detail-section relationship-section" aria-labelledby="video-context-title">
          <h2 id="video-context-title">Learning context</h2>
          {topics.length === 0 && skills.length === 0
            ? <p className="muted">No topics or skills linked yet. Organize this video from the Library.</p>
            : <div className="detail-link-list">
                {topics.map((topic) => <button key={topic.id} onClick={() => navigate(`/library/topics/${topic.id}`)}><Layers3 size={18}/><span><strong>{topic.title}</strong><small>Topic</small></span><ChevronRight size={18} aria-hidden="true"/></button>)}
                {skills.map((skill) => <button key={skill.id} onClick={() => navigate(`/library/skills/${skill.id}`)}><Target size={18}/><span><strong>{skill.title}</strong><small>{skillRelationships[skill.id] === 'demonstrates' ? 'Demonstrates this Skill' : 'Explains this Skill'}</small></span><ChevronRight size={18} aria-hidden="true"/></button>)}
              </div>}
        </section>

        <section className="detail-section relationship-section" aria-labelledby="video-related-title">
          <h2 id="video-related-title">Related items</h2>
          {related.length === 0
            ? <p className="muted">No other related items yet.</p>
            : <div className="detail-static-list">{related.map((node) => <div className="detail-static-row" key={node.id}><strong>{node.title}</strong><small>{node.nodeType.replaceAll('_', ' ')}</small></div>)}</div>}
        </section>
      </>}
    </section>
  )
}
