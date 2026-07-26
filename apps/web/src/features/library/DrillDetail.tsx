import { useState } from 'react'
import { ChevronRight, CirclePlus, Dumbbell, Network, NotebookPen, Pin, PinOff, Play, Target } from 'lucide-react'
import { toast } from 'sonner'
import { NodeNoteComposer } from '../../components/NodeNoteComposer'
import { PictureAttachments } from '../../components/PictureAttachments'
import { VideoThumbnail } from '../../components/VideoThumbnail'
import {
  useAttachLibraryVideo,
  useLibraryNodeResources,
  useLibraryOverview,
  useLinkPersonalDrillSkill,
  useSetLibraryPin,
  useVideos,
} from '../../lib/api/hooks'

export function DrillDetail({ nodeId, navigate }: { nodeId: string; navigate: (to: string) => void }) {
  const resources = useLibraryNodeResources(nodeId)
  const overview = useLibraryOverview()
  const videos = useVideos()
  const pin = useSetLibraryPin(nodeId)
  const attach = useAttachLibraryVideo(nodeId)
  const linkSkill = useLinkPersonalDrillSkill(nodeId)
  const [noteOpen, setNoteOpen] = useState(false)
  const [choosingVideo, setChoosingVideo] = useState(false)
  const [skillQuery, setSkillQuery] = useState('')

  const data = resources.data
  const drill = data?.drill
  const linkedVideoIds = new Set(data?.videos.map((video) => video.id) ?? [])
  const linkedSkillIds = new Set(data?.skills.map((skill) => skill.id) ?? [])
  const availableSkills = (overview.data?.skills ?? [])
    .filter((skill) => !linkedSkillIds.has(skill.nodeId) && skill.name.toLocaleLowerCase().includes(skillQuery.trim().toLocaleLowerCase()))
    .slice(0, 12)

  async function attachVideo(videoId: string) {
    try {
      await attach.mutateAsync(videoId)
      toast.success('Video attached to drill')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not attach video')
    }
  }

  async function addSkill(skillNodeId: string, skillName: string) {
    try {
      await linkSkill.mutateAsync(skillNodeId)
      setSkillQuery('')
      toast.success(`${skillName} linked`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not link Skill')
    }
  }

  return (
    <section className="library-detail-page">
      {resources.isLoading && <div className="library-skeleton">Loading drill…</div>}
      {resources.isError && <div className="notice">This drill could not be loaded.</div>}

      {drill && data && <>
        <header className="library-detail-hero">
          <div className="ontology-symbol detail-title-only"><Dumbbell size={22} /></div>
          <div className="library-detail-title">
            <span className="eyebrow detail-title-only">{drill.isSystem ? 'Starter drill' : 'Personal drill'}</span>
            <h1 className="detail-title-only">{drill.title}</h1>
            {drill.description && <p>{drill.description}</p>}
            <div className="mini-chips">
              <span>{drill.status.replaceAll('_', ' ')}</span>
              {drill.difficulty && <span>{drill.difficulty}</span>}
              {drill.durationMinutes && <span>{drill.durationMinutes} min</span>}
              {drill.repetitionTarget && <span>{drill.repetitionTarget} repetitions</span>}
            </div>
          </div>
        </header>

        <div className="detail-action-bar" aria-label={`${drill.title} actions`}>
          <button className="button secondary" onClick={() => navigate(`/library/connections/${nodeId}`)}><Network size={16} /> Explore connections</button>
          <button className="button secondary" onClick={() => setNoteOpen(true)}><NotebookPen size={16} /> Add note</button>
          <button className="button secondary detail-pin" disabled={pin.isPending} onClick={() => pin.mutate(!data.isPinned)}>
            {data.isPinned ? <><PinOff size={16} /> Unpin</> : <><Pin size={16} /> Pin to top</>}
          </button>
        </div>

        <div className="library-detail-grid">
          {drill.diagramUrl && <article className="card">
            <figure className="drill-diagram">
              <img src={drill.diagramUrl} alt={`${drill.title} movement and ball-placement diagram`} />
              <figcaption>Follow the numbered movement and ball-placement paths.</figcaption>
            </figure>
          </article>}

          {(drill.instructions || drill.description) && <article className="card">
            <h2>How to practise</h2>
            {drill.instructions && <p>{drill.instructions}</p>}
            {!drill.instructions && drill.description && <p>{drill.description}</p>}
          </article>}

          {data.drillSteps.length > 0 && <article className="card">
            <h2>Stroke sequence and spin</h2>
            <ol className="drill-steps">{data.drillSteps.map((step) => <li key={step.id}>
              <span className="step-number">{step.position + 1}</span>
              <span className={`spin-badge ${step.spin}`}>{spinSymbol(step.spin)}<small>{step.spin.replace('_', ' ')}</small></span>
              <div><strong>{step.stroke.replaceAll('_', ' ')}</strong><small>{step.actor} · {step.fromZone.replaceAll('_', ' ')} → {step.targetZone.replaceAll('_', ' ')}</small>{step.instruction && <p>{step.instruction}</p>}</div>
            </li>)}</ol>
          </article>}

          <section className="detail-section relationship-section" aria-labelledby="drill-skills-title">
            <h2 id="drill-skills-title">Skills practised</h2>
            {data.skills.length > 0 ? <div className="detail-link-list">{data.skills.map((skill) =>
              <button key={skill.id} onClick={() => navigate(`/library/skills/${skill.id}`)}><Target size={18} /><span><strong>{skill.title}</strong></span><ChevronRight size={18} aria-hidden="true" /></button>
            )}</div> : <p className="muted">This drill is not linked to a Skill yet.</p>}

            {!drill.isSystem && <div className="stack relationship-editor">
              <h3>Link a Skill</h3>
              <p className="muted">Search for the main table-tennis Skill this drill practises.</p>
              <input value={skillQuery} onChange={(event) => setSkillQuery(event.currentTarget.value)} placeholder="Search Skills" />
              {skillQuery.trim() && <div className="resource-picker">
                {availableSkills.map((skill) => <button className="resource-link" key={skill.nodeId} disabled={linkSkill.isPending} onClick={() => addSkill(skill.nodeId, skill.name)}>{skill.name}<small>Link Skill</small></button>)}
                {availableSkills.length === 0 && <p className="muted">No unlinked Skills match.</p>}
              </div>}
            </div>}
          </section>

          <article className="card">
            <PictureAttachments parentNodeId={nodeId} />
          </article>

          <article className="card">
            <div className="picture-heading">
              <div><h2>Videos</h2><p>Tutorials or examples connected to this drill.</p></div>
              <button className="button secondary" onClick={() => setChoosingVideo((value) => !value)}><Play size={16} /> Attach existing</button>
            </div>
            {data.videos.length > 0 ? <div className="resource-videos">{data.videos.map((video) =>
              <button className="resource-video" key={video.id} onClick={() => navigate(`/videos/${video.id}`)}><VideoThumbnail src={video.thumbnailUrl} title={video.title || video.sourceUrl} compact /><span>{video.title || video.sourceUrl}<small>{video.creatorName || video.sourcePlatform}</small></span><Play size={17} /></button>
            )}</div> : <p className="muted">No tutorial videos are attached yet.</p>}
            {choosingVideo && <div className="resource-picker">
              <h3>Choose from saved videos</h3>
              {videos.data?.filter((video) => !linkedVideoIds.has(video.id)).slice(0, 20).map((video) => <button className="resource-link" key={video.id} disabled={attach.isPending} onClick={() => attachVideo(video.id)}>{video.title || video.sourceUrl}<small>Attach</small></button>)}
              {videos.data?.every((video) => linkedVideoIds.has(video.id)) && <p className="muted">All saved videos are already attached.</p>}
            </div>}
            <button className="button detail-add-video" onClick={() => navigate('/videos/new')}><CirclePlus size={17} /> Add a new video</button>
          </article>
        </div>

        {noteOpen && <NodeNoteComposer target={{ nodeId, title: drill.title, type: 'drill' }} onClose={() => setNoteOpen(false)} />}
      </>}
    </section>
  )
}

function spinSymbol(spin: string) {
  if (spin === 'topspin') return '↻'
  if (spin === 'backspin') return '↺'
  if (spin === 'sidespin') return '⟳'
  if (spin === 'variable') return '⇄'
  return '○'
}
