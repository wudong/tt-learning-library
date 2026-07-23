import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BookOpen, Check, ChevronRight, CirclePlus, Layers3, NotebookPen, Play, Search, Target, X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateNote, useLibraryOverview, useUpdateVideoLearningContext, useVideo, useVideos } from '../../lib/api/hooks'
import { VideoThumbnail } from '../../components/VideoThumbnail'

type Tab = 'topics' | 'skills' | 'videos'
type SkillLink = { skillId: string; relationship: 'explains' | 'demonstrates' }

export function Library({ navigate }: { navigate:(to:string)=>void }) {
  const overview = useLibraryOverview()
  const videos = useVideos()
  const [tab, setTab] = useState<Tab>('topics')
  const [query, setQuery] = useState('')
  const [editingVideoId, setEditingVideoId] = useState('')
  const [noteTarget, setNoteTarget] = useState<{nodeId:string;title:string;type:'topic'|'skill'|'video'} | null>(null)

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const topics = overview.data?.topics.filter((topic) => topic.name.toLocaleLowerCase().includes(normalizedQuery)) ?? []
  const skills = overview.data?.skills.filter((skill) => skill.name.toLocaleLowerCase().includes(normalizedQuery)) ?? []
  const filteredVideos = videos.data?.filter((video) => (video.title || video.sourceUrl).toLocaleLowerCase().includes(normalizedQuery)) ?? []

  return <section className="library-page">
    <header className="library-intro">
      <div>
        <h1>Your learning library</h1>
        <p className="muted">Connect tutorials to the areas and abilities you want to improve.</p>
      </div>
      <button className="button library-add" onClick={() => navigate('/videos/new')}><CirclePlus size={18}/> Add video</button>
    </header>

    <div className="library-tabs" role="tablist" aria-label="Library sections">
      <TabButton active={tab === 'topics'} icon={<Layers3 size={17}/>} label="Topics" count={overview.data?.topics.length ?? 0} onClick={() => setTab('topics')}/>
      <TabButton active={tab === 'skills'} icon={<Target size={17}/>} label="Skills" count={overview.data?.skills.length ?? 0} onClick={() => setTab('skills')}/>
      <TabButton active={tab === 'videos'} icon={<Play size={17}/>} label="Videos" count={videos.data?.length ?? 0} onClick={() => setTab('videos')}/>
    </div>

    <label className="library-search">
      <span className="sr-only">Search current library section</span>
      <Search size={18} aria-hidden="true"/>
      <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={`Search ${tab}`}/>
      {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={17}/></button>}
    </label>

    {(overview.isLoading || videos.isLoading) && <div className="library-skeleton" role="status">Loading your learning library…</div>}
    {(overview.isError || videos.isError) && <div className="notice">We could not load your library. Check your connection and try again.</div>}

    {tab === 'topics' && overview.data && <TopicSection topics={topics} skills={overview.data.skills} counts={overview.data.topicVideoCounts} onNote={setNoteTarget}/>}
    {tab === 'skills' && overview.data && <SkillSection skills={skills} topics={overview.data.topics} counts={overview.data.skillVideoCounts} onNote={setNoteTarget}/>}
    {tab === 'videos' && videos.data && <VideoSection videos={filteredVideos} onOrganize={setEditingVideoId} onOpen={(id) => navigate(`/videos/${id}`)} onNote={setNoteTarget}/>}

    {editingVideoId && overview.data && <VideoContextEditor videoId={editingVideoId} topics={overview.data.topics} skills={overview.data.skills} onClose={() => setEditingVideoId('')}/>}
    {noteTarget && <NoteComposer target={noteTarget} onClose={() => setNoteTarget(null)}/>}
  </section>
}

function TabButton({ active, icon, label, count, onClick }: { active:boolean; icon:ReactNode; label:string; count:number; onClick:()=>void }) {
  return <button role="tab" aria-selected={active} className={active ? 'library-tab active' : 'library-tab'} onClick={onClick}>{icon}<span>{label}</span><small>{count}</small></button>
}

function TopicSection({ topics, skills, counts, onNote }: { topics: Array<{id:string;nodeId:string;name:string;description:string|null}>; skills:Array<{id:string;topicId:string|null;name:string}>; counts:Record<string,number>; onNote:(target:{nodeId:string;title:string;type:'topic'})=>void }) {
  if (!topics.length) return <div className="empty">No topics match this search.</div>
  return <div className="ontology-list">{topics.map((topic) => {
    const topicSkills = skills.filter((skill) => skill.topicId === topic.id)
    return <article className="ontology-row" key={topic.id}>
      <div className="ontology-symbol"><Layers3 size={19}/></div>
      <div className="ontology-copy"><h2>{topic.name}</h2><p>{topic.description || `${topicSkills.length} ${topicSkills.length === 1 ? 'skill' : 'skills'} in this learning area`}</p>
        {topicSkills.length > 0 && <div className="mini-chips">{topicSkills.slice(0, 4).map((skill) => <span key={skill.id}>{skill.name}</span>)}</div>}
      </div>
      <button className="note-action" onClick={() => onNote({nodeId:topic.nodeId,title:topic.name,type:'topic'})}><NotebookPen size={16}/> Note</button>
      <strong className="ontology-count">{counts[topic.id] ?? 0}<small>videos</small></strong>
    </article>
  })}</div>
}

function SkillSection({ skills, topics, counts, onNote }: { skills:Array<{id:string;nodeId:string;name:string;topicId:string|null;status:string;difficulty:string|null}>; topics:Array<{id:string;name:string}>; counts:Record<string,number>; onNote:(target:{nodeId:string;title:string;type:'skill'})=>void }) {
  const [topicFilter, setTopicFilter] = useState('')
  const [visibleLimit, setVisibleLimit] = useState(50)
  const visibleSkills = topicFilter ? skills.filter((skill) => skill.topicId === topicFilter) : skills
  useEffect(() => setVisibleLimit(50), [skills, topicFilter])
  const displayedSkills = visibleSkills.slice(0, visibleLimit)
  return <div>
    <div className="section-action-row"><div><h2>Skills</h2><p>Curated abilities for organizing your personal learning material.</p></div><label className="compact-filter"><span className="sr-only">Filter skills by topic</span><select value={topicFilter} onChange={(event) => setTopicFilter(event.currentTarget.value)}><option value="">All topics</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label></div>
    {!visibleSkills.length ? <div className="empty">No skills match this search and topic.</div> : <><div className="ontology-list">{displayedSkills.map((skill) => <article className="ontology-row" key={skill.id}>
      <div className="ontology-symbol"><Target size={19}/></div>
      <div className="ontology-copy"><h2>{skill.name}</h2><p>{topics.find((topic) => topic.id === skill.topicId)?.name ?? 'No primary topic'} · {skill.status.replaceAll('_', ' ')}</p></div>
      <button className="note-action" onClick={() => onNote({nodeId:skill.nodeId,title:skill.name,type:'skill'})}><NotebookPen size={16}/> Note</button>
      <strong className="ontology-count">{counts[skill.id] ?? 0}<small>videos</small></strong>
    </article>)}</div>{displayedSkills.length < visibleSkills.length && <button className="button secondary load-more" onClick={() => setVisibleLimit((value) => value + 50)}>Load more skills <small>{displayedSkills.length} of {visibleSkills.length}</small></button>}</>}
  </div>
}

function VideoSection({ videos, onOrganize, onOpen, onNote }: { videos:Array<{id:string;nodeId:string;title:string|null;sourceUrl:string;sourcePlatform:string;thumbnailUrl:string|null;progress:string;learningState:string}>; onOrganize:(id:string)=>void; onOpen:(id:string)=>void; onNote:(target:{nodeId:string;title:string;type:'video'})=>void }) {
  if (!videos.length) return <div className="empty"><BookOpen size={28}/><p>No videos match this search. Add a tutorial to start building your learning map.</p></div>
  return <div className="video-library-list">{videos.map((video) => {
    const title = video.title || video.sourceUrl
    return <article className="video-library-row" key={video.id}>
      <VideoThumbnail src={video.thumbnailUrl} title={title} compact/>
      <div className="video-library-copy"><span className="pill">{video.sourcePlatform}</span><h2>{title}</h2><p>{video.progress} · {video.learningState}</p>
        <div className="video-row-actions"><button className="button" onClick={() => onOrganize(video.id)}>Organize</button><button className="button secondary" onClick={() => onNote({nodeId:video.nodeId,title,type:'video'})}><NotebookPen size={16}/> Note</button><button className="button secondary" onClick={() => onOpen(video.id)}>Open <ChevronRight size={17}/></button></div>
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
