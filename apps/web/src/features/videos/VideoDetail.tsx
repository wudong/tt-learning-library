import { FacebookEmbed } from '../../components/FacebookEmbed'
import { PictureAttachments } from '../../components/PictureAttachments'
import { VideoThumbnail } from '../../components/VideoThumbnail'
import { YouTubeEmbed } from '../../components/YouTubeEmbed'
import { useVideo } from '../../lib/api/hooks'

export function VideoDetail({ id }: { id:string }) {
  const video = useVideo(id)
  const data = video.data
  const title = data?.video.title || data?.node.title || 'Video'

  return (
    <section>
      <h1>{title}</h1>
      {video.isLoading && <div className="card">Loading…</div>}
      {data && <>
        <div className="card">
          {data.video.sourcePlatform === 'youtube' && data.video.externalId
            ? <YouTubeEmbed externalId={data.video.externalId} title={title} />
            : data.video.sourcePlatform === 'facebook'
              ? <FacebookEmbed sourceUrl={data.video.canonicalUrl ?? data.video.sourceUrl} title={title} />
              : <VideoThumbnail src={data.video.thumbnailUrl} title={title} />}
          <span className="pill">{data.video.sourcePlatform}</span>
          <h2>{data.node.title}</h2>
          {data.video.creatorName && <p className="muted">By {data.video.creatorName}</p>}
          <p className="muted">{data.video.progress} • {data.video.learningState}</p>
          {data.video.sourcePlatform !== 'facebook' && <a className="button" href={data.video.sourceUrl} target="_blank" rel="noreferrer">Open Video</a>}
        </div>
        <div className="card">
          <h3>Quick actions</h3>
          <div className="quick-actions">
            <button className="button secondary">Note</button>
            <button className="button secondary">Timestamp</button>
            <button className="button secondary">Drill</button>
            <button className="button secondary">More</button>
          </div>
        </div>
        <div className="card"><PictureAttachments parentNodeId={data.node.id}/></div>
        <div className="card">
          <h3>Learning context</h3>
          {data.topics.length === 0 && data.skills.length === 0
            ? <p className="muted">No topics or skills linked yet. Organize this video from the Library.</p>
            : <>
              <div className="mini-chips">{data.topics.map((topic) => <span key={topic.id}>{topic.title}</span>)}</div>
              {data.skills.map((skill) => <p key={skill.id}><strong>{data.skillRelationships[skill.id] === 'demonstrates' ? 'Demonstrates' : 'Explains'}:</strong> {skill.title}</p>)}
            </>}
        </div>
        <div className="card">
          <h3>Related Items</h3>
          {data.related.length === 0 ? <p className="muted">No other related items yet.</p> : data.related.map((node) => <p key={node.id}>{node.title}</p>)}
        </div>
      </>}
    </section>
  )
}
