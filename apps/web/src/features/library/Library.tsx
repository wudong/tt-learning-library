import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BookOpen, Check, ChevronRight, CirclePlus, Dumbbell, Eye, EyeOff, Layers3, NotebookPen, Pin, PinOff, Play, Search, SlidersHorizontal, Target, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAttachLibraryVideo, useCreateLibraryDrill, useCreateNote, useLibraryNodeResources, useLibraryOverview, useLinkPersonalDrillSkill, useSetLibraryPin, useSetTopicVisibility, useUpdateVideoLearningContext, useVideo, useVideos } from '../../lib/api/hooks'
import { VideoThumbnail } from '../../components/VideoThumbnail'
import { PictureAttachments } from '../../components/PictureAttachments'

type Tab = 'topics' | 'skills' | 'drills'
type SkillLink = { skillId: string; relationship: 'explains' | 'demonstrates' }

export function Library({ navigate }: { navigate:(to:string)=>void }) {
  const overview = useLibraryOverview()
  const [tab, setTab] = useState<Tab>('topics')
  const [query, setQuery] = useState('')
  const [managingTopics, setManagingTopics] = useState(false)
  const [selected, setSelected] = useState<{nodeId:string;title:string;type:'drill'} | null>(null)
  const [noteTarget, setNoteTarget] = useState<{nodeId:string;title:string;type:'topic'|'skill'|'video'} | null>(null)

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleTopicIds = new Set(overview.data?.topics.filter((topic) => !topic.isHidden).map((topic) => topic.id) ?? [])
  const topics = overview.data?.topics.filter((topic) => !topic.isHidden && topic.name.toLocaleLowerCase().includes(normalizedQuery)) ?? []
  const skills = overview.data?.skills.filter((skill) => !skill.topicId || visibleTopicIds.has(skill.topicId)) ?? []
  const drills = overview.data?.drills.filter((drill) => drill.title.toLocaleLowerCase().includes(normalizedQuery)) ?? []

  return <section className="library-page">
    <header className="library-intro">
      <div>
        <h1>Your learning library</h1>
        <p className="muted">Connect tutorials to the areas and abilities you want to improve.</p>
      </div>
      <div className="row"><button className="button secondary" onClick={() => setManagingTopics(true)}><SlidersHorizontal size={18}/> Manage Topics</button><button className="button library-add" onClick={() => navigate('/videos/new')}><CirclePlus size={18}/> Add video</button></div>
    </header>

    <div className="library-tabs" role="tablist" aria-label="Library sections">
      <TabButton active={tab === 'topics'} icon={<Layers3 size={17}/>} label="Topics" count={overview.data?.topics.filter((topic) => !topic.isHidden).length ?? 0} onClick={() => setTab('topics')}/>
      <TabButton active={tab === 'skills'} icon={<Target size={17}/>} label="Skills" count={overview.data?.skills.filter((skill) => !skill.topicId || visibleTopicIds.has(skill.topicId)).length ?? 0} onClick={() => setTab('skills')}/>
      <TabButton active={tab === 'drills'} icon={<Dumbbell size={17}/>} label="Drills" count={overview.data?.drills.length ?? 0} onClick={() => setTab('drills')}/>
    </div>

    <label className="library-search">
      <span className="sr-only">Search current library section</span>
      <Search size={18} aria-hidden="true"/>
      <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={`Search ${tab}`}/>
      {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={17}/></button>}
    </label>

    {overview.isLoading && <div className="library-skeleton" role="status">Loading your learning library…</div>}
    {overview.isError && <div className="notice">We could not load your library. Check your connection and try again.</div>}

    {tab === 'topics' && overview.data && <TopicSection topics={topics} skills={overview.data.skills} counts={overview.data.topicVideoCounts} onNote={setNoteTarget} onOpen={(topic) => navigate(`/library/topics/${topic.nodeId}`)}/>}
    {tab === 'skills' && overview.data && <SkillSection query={query} skills={skills} topics={overview.data.topics.filter((topic) => !topic.isHidden)} counts={overview.data.skillVideoCounts} onNote={setNoteTarget} onOpen={(skill) => navigate(`/library/skills/${skill.nodeId}`)}/>}
    {tab === 'drills' && overview.data && <DrillSection drills={drills} onOpen={(drill) => setSelected({nodeId:drill.nodeId,title:drill.title,type:'drill'})}/>}

    {selected && <ResourcePanel target={selected} availableSkills={overview.data?.skills ?? []} navigate={navigate} onClose={() => setSelected(null)}/>}
    {managingTopics && overview.data && <ManageTopics topics={overview.data.topics} onClose={() => setManagingTopics(false)}/>}
    {noteTarget && <NoteComposer target={noteTarget} onClose={() => setNoteTarget(null)}/>}
  </section>
}

function ManageTopics({ topics, onClose }: { topics:Array<{id:string;name:string;isHidden:boolean}>; onClose:()=>void }) {
  const update = useSetTopicVisibility()
  async function toggle(topic: typeof topics[number]) {
    try { await update.mutateAsync({ id: topic.id, hidden: !topic.isHidden }); toast.success(topic.isHidden ? `${topic.name} added to Library` : `${topic.name} hidden`) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update Topic') }
  }
  return <div className="context-editor-layer" role="dialog" aria-modal="true" aria-labelledby="manage-topics-title">
    <button className="context-editor-scrim" aria-label="Close Topic manager" onClick={onClose}/>
    <div className="context-editor"><header><div><span className="eyebrow">Library preferences</span><h2 id="manage-topics-title">Manage Topics</h2><p className="muted">Hidden Topics and all attached learning material remain safely stored.</p></div><button className="toolbar-icon" onClick={onClose} aria-label="Close"><X/></button></header>
      <div className="context-editor-body"><div className="topic-manager">{topics.map((topic) => <div className="topic-toggle" key={topic.id}><span>{topic.name}<small>{topic.isHidden ? 'Hidden from Library' : 'Shown in Library'}</small></span><button className="button secondary" disabled={update.isPending} onClick={() => toggle(topic)}>{topic.isHidden ? <><Eye size={16}/> Add</> : <><EyeOff size={16}/> Hide</>}</button></div>)}</div></div>
      <footer><span className="muted">{topics.filter((topic) => !topic.isHidden).length} of {topics.length} Topics shown</span><button className="button" onClick={onClose}>Done</button></footer>
    </div>
  </div>
}

function TabButton({ active, icon, label, count, onClick }: { active:boolean; icon:ReactNode; label:string; count:number; onClick:()=>void }) {
  return <button role="tab" aria-selected={active} className={active ? 'library-tab active' : 'library-tab'} onClick={onClick}>{icon}<span>{label}</span><small>{count}</small></button>
}

function TopicSection({ topics, skills, counts, onNote, onOpen }: { topics: Array<{id:string;nodeId:string;name:string;description:string|null}>; skills:Array<{id:string;topicId:string|null;name:string}>; counts:Record<string,number>; onNote:(target:{nodeId:string;title:string;type:'topic'})=>void; onOpen:(topic:{nodeId:string;name:string})=>void }) {
  if (!topics.length) return <div className="empty">No topics match this search.</div>
  return <div className="ontology-list">{topics.map((topic) => {
    const topicSkills = skills.filter((skill) => skill.topicId === topic.id)
    return <article className="ontology-row" key={topic.id}>
      <div className="ontology-symbol"><Layers3 size={19}/></div>
      <div className="ontology-copy"><h2>{topic.name}</h2><p>{topic.description || `${topicSkills.length} ${topicSkills.length === 1 ? 'skill' : 'skills'} in this learning area`}</p>
        {topicSkills.length > 0 && <div className="mini-chips">{topicSkills.slice(0, 4).map((skill) => <span key={skill.id}>{skill.name}</span>)}</div>}
      </div>
      <button className="note-action" onClick={() => onNote({nodeId:topic.nodeId,title:topic.name,type:'topic'})}><NotebookPen size={16}/> Note</button>
      <button className="note-action" onClick={() => onOpen(topic)}>Open <ChevronRight size={16}/></button>
      <strong className="ontology-count">{counts[topic.id] ?? 0}<small>videos</small></strong>
    </article>
  })}</div>
}

function SkillSection({ query, skills, topics, counts, onNote, onOpen }: { query:string; skills:Array<{id:string;nodeId:string;name:string;topicId:string|null;status:string;difficulty:string|null;isPinned:boolean}>; topics:Array<{id:string;name:string}>; counts:Record<string,number>; onNote:(target:{nodeId:string;title:string;type:'skill'})=>void; onOpen:(skill:{nodeId:string;name:string})=>void }) {
  const [topicFilter, setTopicFilter] = useState('')
  const [visibleLimit, setVisibleLimit] = useState(50)
  const normalized = query.trim().toLocaleLowerCase()
  const visibleSkills = skills.filter((skill) => (topicFilter ? skill.topicId === topicFilter : normalized ? true : skill.isPinned) && (!normalized || skill.name.toLocaleLowerCase().includes(normalized)))
  useEffect(() => setVisibleLimit(50), [skills, topicFilter, normalized])
  const displayedSkills = visibleSkills.slice(0, visibleLimit)
  return <div>
    <div className="section-action-row"><div><h2>Skills</h2><p>{!topicFilter && !normalized ? 'Pinned Skills are shown first. Choose a Topic or search to browse all Skills.' : 'Curated abilities for organizing your learning material.'}</p></div><label className="compact-filter"><span className="sr-only">Filter skills by topic</span><select value={topicFilter} onChange={(event) => setTopicFilter(event.currentTarget.value)}><option value="">Choose a Topic</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label></div>
    {!visibleSkills.length ? <div className="empty">{!topicFilter && !normalized ? 'Pin frequently used Skills, choose a Topic, or search by name.' : 'No Skills match this search and Topic.'}</div> : <><div className="ontology-list">{displayedSkills.map((skill) => <article className="ontology-row" key={skill.id}>
      <div className="ontology-symbol"><Target size={19}/></div>
      <div className="ontology-copy"><h2>{skill.name}</h2><p>{topics.find((topic) => topic.id === skill.topicId)?.name ?? 'No primary topic'} · {skill.status.replaceAll('_', ' ')}</p></div>
      <button className="note-action" onClick={() => onNote({nodeId:skill.nodeId,title:skill.name,type:'skill'})}><NotebookPen size={16}/> Note</button>
      <button className="note-action" onClick={() => onOpen(skill)}>Open <ChevronRight size={16}/></button>
      <strong className="ontology-count">{counts[skill.id] ?? 0}<small>videos</small></strong>
    </article>)}</div>{displayedSkills.length < visibleSkills.length && <button className="button secondary load-more" onClick={() => setVisibleLimit((value) => value + 50)}>Load more skills <small>{displayedSkills.length} of {visibleSkills.length}</small></button>}</>}
  </div>
}

function DrillSection({ drills, onOpen }: { drills:Array<{id:string;nodeId:string;title:string;description:string|null;diagramUrl:string|null;status:string;durationMinutes:number|null;isPinned:boolean;isSystem:boolean}>; onOpen:(drill:{nodeId:string;title:string})=>void }) {
  const [creating, setCreating] = useState(false)
  return <div><div className="section-action-row"><div><h2>Drills</h2><p>Use a starter Drill or quickly save your own practice idea.</p></div><button className="button" onClick={() => setCreating(true)}><CirclePlus size={17}/> Add Drill</button></div>
  {!drills.length ? <div className="empty"><Dumbbell size={28}/><p>No drills match this search.</p></div> : <div className="ontology-list">{drills.map((drill) => <DrillLibraryRow key={drill.id} drill={drill} onOpen={onOpen}/>)}</div>}
  {creating && <CreateDrillDialog onClose={() => setCreating(false)}/>}</div>
}
function DrillLibraryRow({ drill, onOpen }: { drill:{nodeId:string;title:string;description:string|null;diagramUrl:string|null;status:string;durationMinutes:number|null;isPinned:boolean;isSystem:boolean}; onOpen:(drill:{nodeId:string;title:string})=>void }) {
  const pin = useSetLibraryPin(drill.nodeId)
  return <article className="ontology-row">
    {drill.diagramUrl ? <img className="drill-row-image" src={drill.diagramUrl} alt=""/> : <div className="ontology-symbol"><Dumbbell size={19}/></div>}
    <div className="ontology-copy"><h2>{drill.title}</h2><p>{drill.description || `${drill.status.replaceAll('_', ' ')}${drill.durationMinutes ? ` · ${drill.durationMinutes} min` : ''}`}</p><span className={drill.isSystem ? 'pill' : 'pill personal-idea'}>{drill.isSystem ? 'Starter drill' : 'Personal idea'}</span></div>
    <button className="toolbar-icon" aria-label={drill.isPinned ? `Unpin ${drill.title}` : `Pin ${drill.title}`} disabled={pin.isPending} onClick={() => pin.mutate(!drill.isPinned)}>{drill.isPinned ? <PinOff size={17}/> : <Pin size={17}/>}</button>
    <button className="button secondary" onClick={() => onOpen(drill)}>Open drill <ChevronRight size={16}/></button>
  </article>
}
function CreateDrillDialog({ onClose }: { onClose:()=>void }) {
  const create = useCreateLibraryDrill()
  const [description, setDescription] = useState('')
  async function save() {
    try { await create.mutateAsync({ description }); toast.success('Drill added'); onClose() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add Drill') }
  }
  return <div className="context-editor-layer" role="dialog" aria-modal="true" aria-labelledby="create-drill-title"><button className="context-editor-scrim" aria-label="Close Drill form" onClick={onClose}/><div className="note-composer"><header><div><h2 id="create-drill-title">Add a Drill idea</h2><p className="muted">Describe what you want to practice. We’ll create the short title automatically.</p></div><button className="toolbar-icon" onClick={onClose} aria-label="Close"><X/></button></header><div className="note-composer-body stack"><label>Description<textarea rows={6} maxLength={2000} value={description} onChange={(event) => setDescription(event.currentTarget.value)} placeholder="For example: Alternate two backhands and one forehand, then recover to the middle after every stroke." autoFocus/></label></div><footer><button className="button secondary" onClick={onClose}>Cancel</button><button className="button" disabled={!description.trim() || create.isPending} onClick={save}>{create.isPending ? 'Saving…' : 'Save Drill'}</button></footer></div></div>
}

function ResourcePanel({ target, availableSkills, navigate, onClose }: { target:{nodeId:string;title:string;type:'topic'|'skill'|'drill'}; availableSkills:Array<{nodeId:string;name:string}>; navigate:(to:string)=>void; onClose:()=>void }) {
  const resources = useLibraryNodeResources(target.nodeId)
  const videos = useVideos()
  const attach = useAttachLibraryVideo(target.nodeId)
  const linkSkill = useLinkPersonalDrillSkill(target.nodeId)
  const [choosingVideo, setChoosingVideo] = useState(false)
  const [skillQuery, setSkillQuery] = useState('')
  const linkedIds = new Set(resources.data?.videos.map((video) => video.id) ?? [])
  const linkedSkillIds = new Set(resources.data?.skills.map((skill) => skill.id) ?? [])
  const skillMatches = availableSkills.filter((skill) => !linkedSkillIds.has(skill.nodeId) && skill.name.toLocaleLowerCase().includes(skillQuery.trim().toLocaleLowerCase())).slice(0, 8)
  async function attachVideo(videoId: string) {
    try { await attach.mutateAsync(videoId); toast.success(`Video attached to ${target.title}`) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not attach video') }
  }
  return <div className="context-editor-layer" role="dialog" aria-modal="true" aria-labelledby="resource-title">
    <button className="context-editor-scrim" aria-label="Close learning resources" onClick={onClose}/>
    <div className="context-editor"><header><div><span className="eyebrow">{target.type}</span><h2 id="resource-title">{target.title}</h2>{target.type === 'drill' && resources.data?.drill && <span className={resources.data.drill.isSystem ? 'pill' : 'pill personal-idea'}>{resources.data.drill.isSystem ? 'Starter drill' : 'Personal idea'}</span>}</div><button className="toolbar-icon" onClick={onClose} aria-label="Close"><X/></button></header>
      <div className="context-editor-body stack">
        {resources.isLoading && <div className="library-skeleton">Loading linked learning material…</div>}
        {resources.data && <><PictureAttachments parentNodeId={target.nodeId}/>
          {target.type === 'topic' && <section><h3>Skills in this Topic</h3>{resources.data.skills.length ? <div className="resource-picker">{resources.data.skills.map((skill) => <div className="resource-link" key={skill.id}>{skill.title}<small>Skill</small></div>)}</div> : <p className="muted">No ontology Skills are attached to this Topic.</p>}</section>}
          {target.type === 'drill' && resources.data.drill?.diagramUrl && <figure className="drill-diagram"><img src={resources.data.drill.diagramUrl} alt={`${target.title} movement and ball-placement diagram`}/><figcaption>Follow the numbered paths; spin for each stroke is listed below.</figcaption></figure>}
          {target.type === 'drill' && <section><h3>Skills practiced</h3>{resources.data.skills.length ? <div className="mini-chips">{resources.data.skills.map((skill) => <span key={skill.id}>{skill.title}</span>)}</div> : <p className="muted">This drill is not linked to an ontology skill yet.</p>}</section>}
          {target.type === 'drill' && resources.data.drill && !resources.data.drill.isSystem && <section className="stack"><h3>Link a Skill</h3><p className="muted">Optional. Search for the main Skill this idea practices.</p><input value={skillQuery} onChange={(event) => setSkillQuery(event.currentTarget.value)} placeholder="Search Skills"/>{skillQuery.trim() && <div className="resource-picker">{skillMatches.map((skill) => <button className="resource-link" key={skill.nodeId} disabled={linkSkill.isPending} onClick={async () => {
            try { await linkSkill.mutateAsync(skill.nodeId); setSkillQuery(''); toast.success(`${skill.name} linked`) }
            catch (error) { toast.error(error instanceof Error ? error.message : 'Could not link Skill') }
          }}>{skill.name}<small>Link Skill</small></button>)}{skillMatches.length === 0 && <p className="muted">No unlinked Skills match.</p>}</div>}</section>}
          {target.type === 'drill' && resources.data.drillSteps.length > 0 && <section><h3>Stroke sequence and spin</h3><ol className="drill-steps">{resources.data.drillSteps.map((step) => <li key={step.id}><span className="step-number">{step.position + 1}</span><span className={`spin-badge ${step.spin}`}>{spinSymbol(step.spin)}<small>{step.spin.replace('_',' ')}</small></span><div><strong>{step.stroke.replaceAll('_',' ')}</strong><small>{step.actor} · {step.fromZone.replaceAll('_',' ')} → {step.targetZone.replaceAll('_',' ')}</small></div></li>)}</ol></section>}
          {target.type === 'skill' && resources.data.drills.length > 0 && <section><h3>Drills</h3>{resources.data.drills.map((drill) => <div className="resource-link" key={drill.id}>{drill.title}<small>{drill.status}</small></div>)}</section>}
          <section><h3>Videos</h3>{resources.data.videos.length ? <div className="resource-videos">{resources.data.videos.map((video) => <button className="resource-video" key={video.id} onClick={() => navigate(`/videos/${video.id}`)}><VideoThumbnail src={video.thumbnailUrl} title={video.title || video.sourceUrl} compact/><span>{video.title || video.sourceUrl}<small>{video.creatorName || video.sourcePlatform}</small></span><Play size={17}/></button>)}</div> : <p className="muted">No tutorial videos are attached yet.</p>}</section>
          {choosingVideo && <section><h3>Attach an existing video</h3><div className="resource-picker">{videos.data?.filter((video) => !linkedIds.has(video.id)).slice(0, 20).map((video) => <button className="resource-link" key={video.id} disabled={attach.isPending} onClick={() => attachVideo(video.id)}>{video.title || video.sourceUrl}<small>Attach</small></button>)}{videos.data?.every((video) => linkedIds.has(video.id)) && <p className="muted">All saved videos are already attached.</p>}</div></section>}
        </>}
      </div>
      <footer><button className="button secondary" onClick={onClose}>Close</button>{target.type !== 'topic' && <><button className="button secondary" onClick={() => setChoosingVideo((value) => !value)}><Play size={16}/> Existing video</button><button className="button" onClick={() => navigate('/videos/new')}><CirclePlus size={16}/> Add video</button></>}</footer>
    </div>
  </div>
}

function spinSymbol(spin: string) {
  if (spin === 'topspin') return '↻'
  if (spin === 'backspin') return '↺'
  if (spin === 'sidespin') return '⟳'
  if (spin === 'variable') return '⇄'
  return '○'
}

function VideoSection({ videos, removingId, onOrganize, onOpen, onNote, onRemove }: { videos:Array<{id:string;nodeId:string;title:string|null;sourceUrl:string;sourcePlatform:string;thumbnailUrl:string|null;progress:string;learningState:string}>; removingId?:string; onOrganize:(id:string)=>void; onOpen:(id:string)=>void; onNote:(target:{nodeId:string;title:string;type:'video'})=>void; onRemove:(id:string,title:string)=>void }) {
  if (!videos.length) return <div className="empty"><BookOpen size={28}/><p>No videos match this search. Add a tutorial to start building your learning map.</p></div>
  return <div className="video-library-list">{videos.map((video) => {
    const title = video.title || video.sourceUrl
    return <article className="video-library-row" key={video.id}>
      <VideoThumbnail src={video.thumbnailUrl} title={title} compact/>
      <div className="video-library-copy"><span className="pill">{video.sourcePlatform}</span><h2>{title}</h2><p>{video.progress} · {video.learningState}</p>
        <div className="video-row-actions"><button className="button" onClick={() => onOrganize(video.id)}>Organize</button><button className="button secondary" onClick={() => onNote({nodeId:video.nodeId,title,type:'video'})}><NotebookPen size={16}/> Note</button><button className="button secondary" onClick={() => onOpen(video.id)}>Open <ChevronRight size={17}/></button><button className="button danger" disabled={removingId === video.id} onClick={() => onRemove(video.id,title)}><Trash2 size={16}/>{removingId === video.id ? 'Removing…' : 'Remove'}</button></div>
      </div>
    </article>
  })}</div>
}

function NoteComposer({ target, onClose }: { target:{nodeId:string;title:string;type:'topic'|'skill'|'video'}; onClose:()=>void }) {
  const create = useCreateNote()
  const [body, setBody] = useState('')
  const [noteType, setNoteType] = useState<'plain'|'takeaway'|'question'|'reminder'>('plain')
  async function save() {
    try { await create.mutateAsync({ parentNodeId:target.nodeId, body, noteType }); toast.success(`Note added to ${target.title}`); onClose() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save note') }
  }
  return <div className="context-editor-layer" role="dialog" aria-modal="true" aria-labelledby="note-composer-title">
    <button className="context-editor-scrim" aria-label="Close note editor" onClick={onClose}/>
    <div className="note-composer">
      <header><div><span className="eyebrow">Personal {target.type} note</span><h2 id="note-composer-title">{target.title}</h2></div><button className="toolbar-icon" onClick={onClose} aria-label="Close"><X/></button></header>
      <div className="note-composer-body stack">
        <label>Note type<select value={noteType} onChange={(event) => setNoteType(event.currentTarget.value as typeof noteType)}><option value="plain">Note</option><option value="takeaway">Takeaway</option><option value="question">Question</option><option value="reminder">Reminder</option></select></label>
        <label>Your note<textarea rows={6} autoFocus value={body} onChange={(event) => setBody(event.currentTarget.value)} placeholder={`What do you want to remember about ${target.title}?`}/></label>
        <PictureAttachments parentNodeId={target.nodeId}/>
      </div>
      <footer><button className="button secondary" onClick={onClose}>Cancel</button><button className="button" disabled={!body.trim() || create.isPending} onClick={save}>{create.isPending ? 'Saving…' : 'Save note'}</button></footer>
    </div>
  </div>
}

function VideoContextEditor({ videoId, topics, skills, onClose }: { videoId:string; topics:Array<{id:string;nodeId:string;name:string}>; skills:Array<{id:string;nodeId:string;name:string;topicId:string|null}>; onClose:()=>void }) {
  const video = useVideo(videoId)
  const update = useUpdateVideoLearningContext(videoId)
  const [topicIds, setTopicIds] = useState<string[]>([])
  const [skillLinks, setSkillLinks] = useState<SkillLink[]>([])
  const [skillQuery, setSkillQuery] = useState('')
  const [skillTopic, setSkillTopic] = useState('')
  useEffect(() => {
    if (!video.data) return
    setTopicIds(topics.filter((topic) => video.data!.topics.some((node) => node.id === topic.nodeId)).map((topic) => topic.id))
    setSkillLinks(skills.filter((skill) => video.data!.skills.some((node) => node.id === skill.nodeId)).map((skill) => ({ skillId: skill.id, relationship: video.data!.skillRelationships[skill.nodeId] ?? 'explains' })))
  }, [video.data, topics, skills])
  const visibleSkills = useMemo(() => skills.filter((skill) =>
    (!skillTopic || skill.topicId === skillTopic) &&
    skill.name.toLocaleLowerCase().includes(skillQuery.trim().toLocaleLowerCase())
  ), [skills, skillQuery, skillTopic])
  const toggleTopic = (id:string) => setTopicIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  const toggleSkill = (id:string) => setSkillLinks((current) => current.some((link) => link.skillId === id) ? current.filter((link) => link.skillId !== id) : [...current, { skillId:id, relationship:'explains' }])
  async function save() {
    try { await update.mutateAsync({ topicIds, skills:skillLinks }); toast.success('Learning context saved'); onClose() }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save learning context') }
  }
  return <div className="context-editor-layer" role="dialog" aria-modal="true" aria-labelledby="context-editor-title">
    <button className="context-editor-scrim" aria-label="Close editor" onClick={onClose}/>
    <div className="context-editor">
      <header><div><span className="eyebrow">Organize video</span><h2 id="context-editor-title">{video.data?.video.title || 'Learning context'}</h2></div><button className="toolbar-icon" onClick={onClose} aria-label="Close"><X/></button></header>
      {video.isLoading ? <div className="library-skeleton">Loading current connections…</div> : <div className="context-editor-body">
        <fieldset><legend>Topics</legend><p>Broad areas this tutorial belongs to.</p><div className="choice-chips">{topics.map((topic) => <button type="button" className={topicIds.includes(topic.id) ? 'choice-chip selected' : 'choice-chip'} aria-pressed={topicIds.includes(topic.id)} key={topic.id} onClick={() => toggleTopic(topic.id)}>{topicIds.includes(topic.id) && <Check size={15}/>} {topic.name}</button>)}</div></fieldset>
        <fieldset><legend>Skills</legend><p>Choose what the video teaches, then describe how.</p><div className="skill-picker-filters"><label className="skill-filter"><Search size={17}/><input value={skillQuery} onChange={(event) => setSkillQuery(event.currentTarget.value)} placeholder="Find a skill"/></label><label className="compact-filter"><span className="sr-only">Filter selectable skills by topic</span><select value={skillTopic} onChange={(event) => setSkillTopic(event.currentTarget.value)}><option value="">All topics</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label></div>
          <div className="skill-choice-list">{visibleSkills.slice(0, 60).map((skill) => { const link = skillLinks.find((item) => item.skillId === skill.id); return <div className={link ? 'skill-choice selected' : 'skill-choice'} key={skill.id}>
            <button type="button" onClick={() => toggleSkill(skill.id)} aria-pressed={!!link}><span className="check-box">{link && <Check size={15}/>}</span><span>{skill.name}<small>{topics.find((topic) => topic.id === skill.topicId)?.name ?? 'No topic'}</small></span></button>
            {link && <select aria-label={`Relationship to ${skill.name}`} value={link.relationship} onChange={(event) => setSkillLinks((current) => current.map((item) => item.skillId === skill.id ? {...item, relationship:event.currentTarget.value as SkillLink['relationship']} : item))}><option value="explains">Explains</option><option value="demonstrates">Demonstrates</option></select>}
          </div>})}</div>{visibleSkills.length > 60 && <p className="picker-hint">Showing the first 60 matches. Search or choose a Topic to narrow the list.</p>}
        </fieldset>
      </div>}
      <footer><button className="button secondary" onClick={onClose}>Cancel</button><button className="button" disabled={video.isLoading || update.isPending} onClick={save}>{update.isPending ? 'Saving…' : 'Save context'}</button></footer>
    </div>
  </div>
}
