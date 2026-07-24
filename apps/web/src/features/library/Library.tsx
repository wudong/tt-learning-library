import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight, CirclePlus, Dumbbell, Eye, EyeOff, Layers3, NotebookPen, Pin, PinOff, Search, SlidersHorizontal, Target, X } from 'lucide-react'
import { toast } from 'sonner'
import { NodeNoteComposer } from '../../components/NodeNoteComposer'
import { useCreateLibraryDrill, useLibraryOverview, useSetLibraryPin, useSetTopicVisibility } from '../../lib/api/hooks'

type Tab = 'topics' | 'skills' | 'drills'
type NoteTarget = { nodeId: string; title: string; type: 'topic' | 'skill' | 'drill' }

export function Library({ navigate }: { navigate:(to:string)=>void }) {
  const overview = useLibraryOverview()
  const [tab, setTab] = useState<Tab>('topics')
  const [query, setQuery] = useState('')
  const [managingTopics, setManagingTopics] = useState(false)
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null)

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleTopicIds = new Set(overview.data?.topics.filter((topic) => !topic.isHidden).map((topic) => topic.id) ?? [])
  const topics = overview.data?.topics.filter((topic) => !topic.isHidden && topic.name.toLocaleLowerCase().includes(normalizedQuery)) ?? []
  const skills = overview.data?.skills.filter((skill) => !skill.topicId || visibleTopicIds.has(skill.topicId)) ?? []
  const drills = overview.data?.drills.filter((drill) => !normalizedQuery || drill.title.toLocaleLowerCase().includes(normalizedQuery) || drill.description?.toLocaleLowerCase().includes(normalizedQuery)) ?? []

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
    {tab === 'drills' && overview.data && <DrillSection drills={drills} onNote={setNoteTarget} onOpen={(drill) => navigate(`/library/drills/${drill.nodeId}`)}/>} 

    {managingTopics && overview.data && <ManageTopics topics={overview.data.topics} onClose={() => setManagingTopics(false)}/>} 
    {noteTarget && <NodeNoteComposer target={noteTarget} onClose={() => setNoteTarget(null)}/>} 
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

function TopicSection({ topics, skills, counts, onNote, onOpen }: { topics: Array<{id:string;nodeId:string;name:string;description:string|null}>; skills:Array<{id:string;topicId:string|null;name:string}>; counts:Record<string,number>; onNote:(target:NoteTarget)=>void; onOpen:(topic:{nodeId:string;name:string})=>void }) {
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

function SkillSection({ query, skills, topics, counts, onNote, onOpen }: { query:string; skills:Array<{id:string;nodeId:string;name:string;topicId:string|null;status:string;difficulty:string|null;isPinned:boolean}>; topics:Array<{id:string;name:string}>; counts:Record<string,number>; onNote:(target:NoteTarget)=>void; onOpen:(skill:{nodeId:string;name:string})=>void }) {
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

function DrillSection({ drills, onNote, onOpen }: { drills:Array<{id:string;nodeId:string;title:string;description:string|null;diagramUrl:string|null;status:string;durationMinutes:number|null;isPinned:boolean;isSystem:boolean}>; onNote:(target:NoteTarget)=>void; onOpen:(drill:{nodeId:string;title:string})=>void }) {
  const [creating, setCreating] = useState(false)
  return <div><div className="section-action-row"><div><h2>Drills</h2><p>Use a starter Drill or quickly save your own practice idea.</p></div><button className="button" onClick={() => setCreating(true)}><CirclePlus size={17}/> Add Drill</button></div>
  {!drills.length ? <div className="empty"><Dumbbell size={28}/><p>No drills match this search.</p></div> : <div className="ontology-list">{drills.map((drill) => <DrillLibraryRow key={drill.id} drill={drill} onNote={onNote} onOpen={onOpen}/>)}</div>}
  {creating && <CreateDrillDialog onClose={() => setCreating(false)}/>}</div>
}

function DrillLibraryRow({ drill, onNote, onOpen }: { drill:{nodeId:string;title:string;description:string|null;diagramUrl:string|null;status:string;durationMinutes:number|null;isPinned:boolean;isSystem:boolean}; onNote:(target:NoteTarget)=>void; onOpen:(drill:{nodeId:string;title:string})=>void }) {
  const pin = useSetLibraryPin(drill.nodeId)
  return <article className="ontology-row">
    {drill.diagramUrl ? <img className="drill-row-image" src={drill.diagramUrl} alt=""/> : <div className="ontology-symbol"><Dumbbell size={19}/></div>}
    <div className="ontology-copy"><h2>{drill.title}</h2><p>{drill.description || `${drill.status.replaceAll('_', ' ')}${drill.durationMinutes ? ` · ${drill.durationMinutes} min` : ''}`}</p><span className={drill.isSystem ? 'pill' : 'pill personal-idea'}>{drill.isSystem ? 'Starter drill' : 'Personal idea'}</span></div>
    <button className="note-action" onClick={() => onNote({nodeId:drill.nodeId,title:drill.title,type:'drill'})}><NotebookPen size={16}/> Note</button>
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
