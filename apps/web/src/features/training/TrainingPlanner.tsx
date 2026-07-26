import { useEffect, useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import { ArrowDown, ArrowUp, CalendarDays, Check, ChevronRight, Edit3, Layers3, Link2, Plus, Target, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CreateTrainingSessionRequest, TrainingSessionDetailDto } from '@ttll/shared'
import { Dialog } from '../../components/Dialog'
import { TopicPickerDialog } from '../../components/TopicPickerDialog'
import { useCreateTrainingSession, useLibraryOverview, useTrainingPracticeOptions, useTrainingSession, useTrainingSessions } from '../../lib/api/hooks'

type Mode = 'planned'|'quick'|'manual'
type Stage = 'entry'|'compose'|'review'
type Picker = 'topic'|'skill'|null
type BlockDraft = {
  key: string
  skillId: string
  drillId: string
  videoId: string
  minutes: number
  focusNote: string
  confidence: string
}

const newBlock = (skillId = ''): BlockDraft => ({ key: crypto.randomUUID(), skillId, drillId: '', videoId: '', minutes: 15, focusNote: '', confidence: '' })
const localDate = () => new Date().toLocaleDateString('en-CA')
const dateString = (date: Date) => format(date, 'yyyy-MM-dd')

export function TrainingPlanner({ navigate }: { navigate: (to: string) => void }) {
  const params = new URLSearchParams(location.search)
  const requestedMode = params.get('mode')
  const mode: Mode = requestedMode === 'quick' || requestedMode === 'manual' ? requestedMode : 'planned'
  const [stage, setStage] = useState<Stage>(mode === 'planned' ? 'entry' : 'compose')
  const [date, setDate] = useState(params.get('date') || localDate())
  const [title, setTitle] = useState('')
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const [blocks, setBlocks] = useState<BlockDraft[]>([])
  const [activeBlockKey, setActiveBlockKey] = useState('')
  const [picker, setPicker] = useState<Picker>(null)
  const [templateId, setTemplateId] = useState('')
  const [overallRating, setOverallRating] = useState('')
  const [reflection, setReflection] = useState('')
  const overview = useLibraryOverview()
  const create = useCreateTrainingSession()
  const recentSessions = useTrainingSessions(dateString(subDays(new Date(), 90)), localDate())
  const template = useTrainingSession(templateId)
  const topics = overview.data?.topics.filter((topic) => !topic.isHidden) ?? []
  const skills = overview.data?.skills ?? []
  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId)

  const skillUseCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const session of recentSessions.data ?? []) {
      for (const name of session.skillNames) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return counts
  }, [recentSessions.data])

  const suggestedTopic = useMemo(() => {
    const ranked = skills
      .map((skill) => ({ skill, count: skillUseCounts.get(skill.name) ?? 0 }))
      .filter((entry) => entry.count > 0 && entry.skill.topicId)
      .sort((a, b) => b.count - a.count)
    return topics.find((topic) => topic.id === ranked[0]?.skill.topicId)
  }, [skills, skillUseCounts, topics])

  const availableSkills = useMemo(() => {
    if (!selectedTopicId) return []
    return skills
      .filter((skill) => skill.topicId === selectedTopicId)
      .sort((a, b) => (skillUseCounts.get(b.name) ?? 0) - (skillUseCounts.get(a.name) ?? 0) || a.name.localeCompare(b.name))
  }, [skills, selectedTopicId, skillUseCounts])

  const recentPlans = (recentSessions.data ?? [])
    .filter((session) => session.entryMode !== 'manual')
    .slice(0, 5)

  useEffect(() => {
    const data = template.data
    if (!data || data.session.id !== templateId) return
    const loaded = data.blocks.map((block) => ({
      key: crypto.randomUUID(),
      skillId: block.skillId,
      drillId: block.drillId ?? '',
      videoId: block.videoId ?? '',
      minutes: Math.max(1, Math.round((block.plannedDurationSeconds ?? 900) / 60)),
      focusNote: block.focusNote ?? '',
      confidence: '',
    }))
    setTitle(data.session.title)
    setBlocks(loaded)
    setActiveBlockKey(loaded[0]?.key ?? '')
    const topicIds = new Set(loaded.map((block) => skills.find((skill) => skill.id === block.skillId)?.topicId).filter(Boolean))
    setSelectedTopicId(topicIds.size === 1 ? [...topicIds][0] ?? '' : '')
    setTemplateId('')
    setStage('compose')
    toast.success('Recent plan loaded as a new draft')
  }, [template.data, templateId, skills])

  const updateBlock = (key: string, patch: Partial<BlockDraft>) => setBlocks((current) => current.map((block) => block.key === key ? { ...block, ...patch } : block))
  const moveBlock = (index: number, direction: -1|1) => setBlocks((current) => {
    const next = [...current]
    const destination = index + direction
    if (destination < 0 || destination >= next.length) return current
    ;[next[index], next[destination]] = [next[destination], next[index]]
    return next
  })

  function chooseTopic(topicId: string) {
    const removed = blocks.filter((block) => skills.find((skill) => skill.id === block.skillId)?.topicId !== topicId)
    const kept = blocks.filter((block) => skills.find((skill) => skill.id === block.skillId)?.topicId === topicId)
    setSelectedTopicId(topicId)
    setBlocks(kept)
    setActiveBlockKey(kept[0]?.key ?? '')
    setPicker(null)
    if (removed.length) toast.info(`${removed.length} skill ${removed.length === 1 ? 'was' : 'were'} removed because the topic changed`)
  }

  function addSkill(skillId: string) {
    const existing = blocks.find((block) => block.skillId === skillId)
    if (existing) {
      setActiveBlockKey(existing.key)
    } else {
      const block = newBlock(skillId)
      setBlocks((current) => [...current, block])
      setActiveBlockKey(block.key)
    }
    setPicker(null)
  }

  async function save() {
    if (blocks.length === 0 || blocks.some((block) => !block.skillId || !Number.isFinite(block.minutes) || block.minutes < 1)) {
      toast.error('Add at least one skill and one minute for every block')
      setStage('compose')
      return
    }
    const uniqueCheckins = new Map<string, { skillId: string; confidenceRating: number }>()
    if (mode === 'manual') for (const block of blocks) if (block.confidence) uniqueCheckins.set(block.skillId, { skillId: block.skillId, confidenceRating: Number(block.confidence) })
    const body: CreateTrainingSessionRequest = {
      scheduledDate: date,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      title: title.trim() || undefined,
      entryMode: mode,
      blocks: blocks.map((block) => ({
        skillId: block.skillId,
        drillId: block.drillId || null,
        videoId: block.videoId || null,
        plannedDurationSeconds: mode === 'manual' ? null : Math.round(block.minutes * 60),
        actualDurationSeconds: mode === 'manual' ? Math.round(block.minutes * 60) : undefined,
        focusNote: block.focusNote.trim() || null,
      })),
      overallRating: overallRating ? Number(overallRating) : null,
      reflection: reflection.trim() || null,
      checkins: [...uniqueCheckins.values()],
    }
    try {
      const result = await create.mutateAsync(body)
      toast.success(mode === 'manual' ? 'Training added to your history' : mode === 'quick' ? 'Quick session ready' : 'Training plan saved')
      navigate(mode === 'quick' ? `/training/${result.session.id}/run` : `/training/${result.session.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save training')
    }
  }

  if (stage === 'entry') return <section className="training-planner planner-entry">
    <div className="planner-step-heading"><div><h2>Start from a recent plan</h2><p>Reuse your own previous choices, or create a fresh plan.</p></div></div>
    {recentSessions.isLoading && <div className="library-skeleton">Finding your recent plans…</div>}
    {recentPlans.length > 0 && <div className="recent-plan-list">{recentPlans.map((session) => <button
      className="recent-plan-card"
      key={session.id}
      onClick={() => session.status === 'planned' ? navigate(`/training/${session.id}`) : setTemplateId(session.id)}
      disabled={template.isLoading && templateId === session.id}
    >
      <span><strong>{session.title}</strong><small>{session.skillNames.join(' · ') || 'Training plan'} · {new Date(`${session.scheduledDate}T12:00:00`).toLocaleDateString()}</small></span>
      <span className="library-catalog-open-label">{session.status === 'planned' ? 'Continue plan' : 'Use as template'} <ChevronRight size={15} /></span>
    </button>)}</div>}
    {!recentSessions.isLoading && recentPlans.length === 0 && <div className="empty">No recent plans yet. Your first plan can start from any Topic.</div>}
    <button className="button" onClick={() => setStage('compose')}><Plus size={18} /> Create a new plan</button>
  </section>

  if (stage === 'review') return <section className="training-planner">
    <div className="planner-step-heading"><div><span className="eyebrow">Review</span><h2>{title.trim() || 'Training plan'}</h2><p>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div><strong>{blocks.reduce((total, block) => total + block.minutes, 0)} min</strong></div>
    <div className="plan-review">
      {blocks.map((block, index) => <div className="plan-review-row" key={block.key}><span><strong>{index + 1}. {skills.find((skill) => skill.id === block.skillId)?.name}</strong><small>{block.focusNote || 'No focus cue'}</small></span><strong>{block.minutes} min</strong></div>)}
    </div>
    {mode === 'manual' && <div className="manual-reflection">
      <h2>How did it go? <small>optional</small></h2>
      <label><span>Overall session</span><select value={overallRating} onChange={(event) => setOverallRating(event.currentTarget.value)}><option value="">No rating</option><option value="1">1 · Rough session</option><option value="2">2 · Difficult</option><option value="3">3 · Solid</option><option value="4">4 · Strong</option><option value="5">5 · Excellent</option></select></label>
      <label><span>Reflection</span><textarea rows={4} value={reflection} maxLength={5000} placeholder="What worked, what to adjust next time…" onChange={(event) => setReflection(event.currentTarget.value)} /></label>
    </div>}
    <div className="planner-footer"><button className="button secondary" onClick={() => setStage('compose')}>Back to edit</button><button className="button" disabled={create.isPending} onClick={() => void save()}>{create.isPending ? 'Saving…' : mode === 'quick' ? 'Continue to timer' : mode === 'manual' ? 'Add to history' : 'Save plan'}</button></div>
  </section>

  return <section className="training-planner">
    <div className="planner-basics">
      <label><span>Date</span><span className="input-with-icon"><CalendarDays size={18} /><input type="date" value={date} max={mode === 'manual' ? localDate() : undefined} onChange={(event) => setDate(event.currentTarget.value)} /></span></label>
      <label><span>Session name <small>optional</small></span><input className="input" value={title} maxLength={200} placeholder="Club practice, serve focus…" onChange={(event) => setTitle(event.currentTarget.value)} /></label>
    </div>

    <section className="planner-step">
      <div className="planner-step-heading"><div><span className="eyebrow">1 · Topic</span><h2>Choose the practice area</h2><p>Skills are filtered to the Topic you choose.</p></div></div>
      {suggestedTopic && !selectedTopicId && <button className="choice-trigger" onClick={() => chooseTopic(suggestedTopic.id)}><span><strong>Last used: {suggestedTopic.name}</strong><small>Suggestion based on your recent plans</small></span><ChevronRight size={18} /></button>}
      <button className="choice-trigger" onClick={() => setPicker('topic')}><span><strong>{selectedTopic?.name ?? 'Choose a Topic'}</strong><small>{selectedTopic?.description ?? 'Required before adding skills'}</small></span><><Layers3 size={18} /><ChevronRight size={17} /></></button>
    </section>

    <section className="planner-step">
      <div className="planner-step-heading"><div><span className="eyebrow">2 · Skills</span><h2>Build the session</h2><p>Only one skill editor stays open at a time.</p></div><strong>{blocks.reduce((total, block) => total + (Number(block.minutes) || 0), 0)} min</strong></div>
      {!selectedTopicId && <div className="notice">Choose a Topic before adding skills. This keeps the selector focused and relevant.</div>}
      {blocks.length > 0 && <div className="plan-block-list">{blocks.map((block, index) => <PlanBlock
        key={block.key}
        block={block}
        index={index}
        count={blocks.length}
        mode={mode}
        skillName={skills.find((skill) => skill.id === block.skillId)?.name ?? 'Skill'}
        expanded={activeBlockKey === block.key}
        onExpand={() => setActiveBlockKey(block.key)}
        onChange={(patch) => updateBlock(block.key, patch)}
        onMove={(direction) => moveBlock(index, direction)}
        onRemove={() => {
          setBlocks((current) => current.filter((item) => item.key !== block.key))
          setActiveBlockKey((current) => current === block.key ? blocks.find((item) => item.key !== block.key)?.key ?? '' : current)
        }}
      />)}</div>}
      <button className="add-block-button" disabled={!selectedTopicId} onClick={() => setPicker('skill')}><Plus size={18} /> {blocks.length ? 'Add another skill' : 'Add a skill'}</button>
    </section>

    <div className="planner-footer"><button className="button secondary" onClick={() => mode === 'planned' ? setStage('entry') : navigate('/training')}>Cancel</button><button className="button" disabled={!blocks.length} onClick={() => setStage('review')}>Review plan</button></div>

    {picker === 'topic' && <TopicPickerDialog
      title="Choose a Topic"
      eyebrow="Practice area"
      topics={topics}
      selectedIds={selectedTopicId ? [selectedTopicId] : []}
      multiple={false}
      onChange={(ids) => ids[0] && chooseTopic(ids[0])}
      onClose={() => setPicker(null)}
    />}
    {picker === 'skill' && <SkillPicker
      topicName={selectedTopic?.name ?? 'Selected Topic'}
      skills={availableSkills}
      selectedSkillIds={blocks.map((block) => block.skillId)}
      recentNames={skillUseCounts}
      onChoose={addSkill}
      onClose={() => setPicker(null)}
    />}
  </section>
}

function PlanBlock({
  block,
  index,
  count,
  mode,
  skillName,
  expanded,
  onExpand,
  onChange,
  onMove,
  onRemove,
}: {
  block: BlockDraft
  index: number
  count: number
  mode: Mode
  skillName: string
  expanded: boolean
  onExpand: () => void
  onChange: (patch: Partial<BlockDraft>) => void
  onMove: (direction: -1|1) => void
  onRemove: () => void
}) {
  const options = useTrainingPracticeOptions(block.skillId)
  return <article className="plan-block-summary">
    <header>
      <span className="block-order">{index + 1}</span>
      <button onClick={onExpand} aria-expanded={expanded}><span><strong>{skillName}</strong><small>{block.minutes} min{block.drillId ? ' · Drill selected' : ''}{block.videoId ? ' · Video selected' : ''}</small></span></button>
      <div className="plan-block-controls">
        <button onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${skillName} earlier`}><ArrowUp size={17} /></button>
        <button onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${skillName} later`}><ArrowDown size={17} /></button>
        <button onClick={onRemove} disabled={count === 1} aria-label={`Remove ${skillName}`}><Trash2 size={17} /></button>
      </div>
    </header>
    {expanded && <div className="plan-block-editor">
      <label><span>{mode === 'manual' ? 'Actual minutes' : 'Target minutes'}</span><input className="input" type="number" inputMode="numeric" min="1" max="180" value={block.minutes} onChange={(event) => onChange({ minutes: Number(event.currentTarget.value) })} /></label>
      <label><span>Drill <small>optional</small></span><select disabled={options.isLoading} value={block.drillId} onChange={(event) => onChange({ drillId: event.currentTarget.value })}><option value="">{options.isLoading ? 'Loading drills…' : 'No drill selected'}</option>{options.data?.drills.map((drill) => <option key={drill.id} value={drill.id}>{drill.title}</option>)}</select></label>
      <label><span>Reference video <small>optional</small></span><select disabled={options.isLoading} value={block.videoId} onChange={(event) => onChange({ videoId: event.currentTarget.value })}><option value="">{options.isLoading ? 'Loading videos…' : 'No video selected'}</option>{options.data?.videos.map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}</select></label>
      {options.data && options.data.drills.length === 0 && <p className="attachment-hint"><Link2 size={16} /> No curated Drill is linked to this Skill yet.</p>}
      {options.data && options.data.videos.length === 0 && <p className="attachment-hint"><Link2 size={16} /> No linked videos yet.</p>}
      <label className="focus-field"><span>{mode === 'manual' ? 'Training note' : 'Focus cue'} <small>optional</small></span><input className="input" value={block.focusNote} maxLength={500} placeholder="Stay low, recover after every ball…" onChange={(event) => onChange({ focusNote: event.currentTarget.value })} /></label>
      {mode === 'manual' && <label><span>Confidence after training <small>optional</small></span><select value={block.confidence} onChange={(event) => onChange({ confidence: event.currentTarget.value })}><option value="">No check-in</option><option value="1">1 · Not clicking yet</option><option value="2">2 · Starting to click</option><option value="3">3 · Repeatable in drills</option><option value="4">4 · Reliable under pressure</option><option value="5">5 · Match ready</option></select></label>}
      <button className="button secondary" onClick={() => onExpand()}><Edit3 size={16} /> Editing {skillName}</button>
    </div>}
  </article>
}

function SkillPicker({ topicName, skills, selectedSkillIds, recentNames, onChoose, onClose }: { topicName: string; skills: Array<{ id: string; name: string }>; selectedSkillIds: string[]; recentNames: Map<string, number>; onChoose: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLocaleLowerCase()
  const visible = skills.filter((skill) => !normalized || skill.name.toLocaleLowerCase().includes(normalized))
  return <Dialog title="Add a skill" eyebrow={topicName} variant="sheet" onClose={onClose}>
    <input autoFocus className="input choice-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search matching skills" />
    <div className="choice-list">{visible.map((skill) => <button key={skill.id} className={`choice-option ${selectedSkillIds.includes(skill.id) ? 'selected' : ''}`} onClick={() => onChoose(skill.id)}><span className="choice-check"><Check size={17} /></span><span><strong>{skill.name}</strong><small>{recentNames.has(skill.name) ? 'Recently used' : 'Available for this Topic'}</small></span><Target size={17} /></button>)}{!visible.length && <div className="empty">No Skills match this Topic and search.</div>}</div>
  </Dialog>
}
