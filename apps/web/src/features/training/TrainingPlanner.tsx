import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarDays, Link2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CreateTrainingSessionRequest } from '@ttll/shared'
import { useCreateLinkedTrainingDrill, useCreateTrainingSession, useLibraryOverview, useTrainingPracticeOptions } from '../../lib/api/hooks'

type Mode = 'planned'|'quick'|'manual'
type BlockDraft = {
  key: string
  skillId: string
  drillId: string
  videoId: string
  minutes: number
  focusNote: string
  confidence: string
}

const newBlock = (): BlockDraft => ({ key: crypto.randomUUID(), skillId: '', drillId: '', videoId: '', minutes: 15, focusNote: '', confidence: '' })
const localDate = () => new Date().toLocaleDateString('en-CA')

export function TrainingPlanner({ navigate }: { navigate: (to: string) => void }) {
  const params = new URLSearchParams(location.search)
  const requestedMode = params.get('mode')
  const mode: Mode = requestedMode === 'quick' || requestedMode === 'manual' ? requestedMode : 'planned'
  const [date, setDate] = useState(params.get('date') || localDate())
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<BlockDraft[]>([newBlock()])
  const [overallRating, setOverallRating] = useState('')
  const [reflection, setReflection] = useState('')
  const overview = useLibraryOverview()
  const create = useCreateTrainingSession()
  const topics = overview.data?.topics ?? []
  const skills = overview.data?.skills ?? []
  const skillsByTopic = useMemo(() => topics.map((topic) => ({ topic, skills: skills.filter((skill) => skill.topicId === topic.id) })).filter((group) => group.skills.length), [topics, skills])

  const updateBlock = (key: string, patch: Partial<BlockDraft>) => setBlocks((current) => current.map((block) => block.key === key ? { ...block, ...patch } : block))
  const moveBlock = (index: number, direction: -1|1) => setBlocks((current) => {
    const next = [...current]
    const destination = index + direction
    if (destination < 0 || destination >= next.length) return current
    ;[next[index], next[destination]] = [next[destination], next[index]]
    return next
  })

  async function save() {
    if (blocks.some((block) => !block.skillId || !Number.isFinite(block.minutes) || block.minutes < 1)) {
      toast.error('Choose a skill and at least one minute for every block')
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

  const heading = mode === 'manual' ? 'Log training' : mode === 'quick' ? 'Quick start' : 'Plan a session'
  return <section className="training-planner">
    <header>
      <span className="eyebrow">{mode === 'manual' ? 'Add what already happened' : 'Build the next practice'}</span>
      <h1>{heading}</h1>
      <p>{mode === 'manual' ? 'Record the actual time you spent and add an optional confidence check.' : 'Choose the skills in order. Drill and video references stay optional.'}</p>
    </header>

    <div className="planner-basics">
      <label><span>Date</span><span className="input-with-icon"><CalendarDays size={18}/><input type="date" value={date} max={mode === 'manual' ? localDate() : undefined} onChange={(event) => setDate(event.currentTarget.value)}/></span></label>
      <label><span>Session name <small>optional</small></span><input className="input" value={title} maxLength={200} placeholder="Club practice, serve focus…" onChange={(event) => setTitle(event.currentTarget.value)}/></label>
    </div>

    <div className="planner-section-head">
      <div><span className="eyebrow">In order</span><h2>Skill blocks</h2></div>
      <strong>{blocks.reduce((total, block) => total + (Number(block.minutes) || 0), 0)} min</strong>
    </div>

    <div className="block-editor-list">
      {blocks.map((block, index) => <BlockEditor
        key={block.key}
        block={block}
        index={index}
        count={blocks.length}
        mode={mode}
        skillGroups={skillsByTopic}
        onChange={(patch) => updateBlock(block.key, patch)}
        onMove={(direction) => moveBlock(index, direction)}
        onRemove={() => setBlocks((current) => current.filter((item) => item.key !== block.key))}
      />)}
    </div>
    <button className="add-block-button" onClick={() => setBlocks((current) => [...current, newBlock()])}><Plus size={18}/> Add another skill</button>

    {mode === 'manual' && <div className="manual-reflection">
      <h2>How did it go? <small>optional</small></h2>
      <label><span>Overall session</span><select value={overallRating} onChange={(event) => setOverallRating(event.currentTarget.value)}><option value="">No rating</option><option value="1">1 · Rough session</option><option value="2">2 · Difficult</option><option value="3">3 · Solid</option><option value="4">4 · Strong</option><option value="5">5 · Excellent</option></select></label>
      <label><span>Reflection</span><textarea rows={4} value={reflection} maxLength={5000} placeholder="What worked, what to adjust next time…" onChange={(event) => setReflection(event.currentTarget.value)}/></label>
    </div>}

    <div className="planner-footer">
      <button className="button secondary" onClick={() => navigate('/training')}>Cancel</button>
      <button className="button" disabled={create.isPending || overview.isLoading} onClick={save}>{create.isPending ? 'Saving…' : mode === 'quick' ? 'Continue to timer' : mode === 'manual' ? 'Add to history' : 'Save plan'}</button>
    </div>
  </section>
}

function BlockEditor({
  block,
  index,
  count,
  mode,
  skillGroups,
  onChange,
  onMove,
  onRemove,
}: {
  block: BlockDraft
  index: number
  count: number
  mode: Mode
  skillGroups: Array<{ topic: { id: string; name: string }; skills: Array<{ id: string; name: string }> }>
  onChange: (patch: Partial<BlockDraft>) => void
  onMove: (direction: -1|1) => void
  onRemove: () => void
}) {
  const options = useTrainingPracticeOptions(block.skillId)
  const createDrill = useCreateLinkedTrainingDrill(block.skillId)
  const [drillTitle, setDrillTitle] = useState('')
  return <article className="block-editor">
    <header>
      <span className="block-order">{index + 1}</span>
      <strong>{block.skillId ? skillGroups.flatMap((group) => group.skills).find((skill) => skill.id === block.skillId)?.name : 'Choose a skill'}</strong>
      <div>
        <button onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move block ${index + 1} earlier`}><ArrowUp size={17}/></button>
        <button onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move block ${index + 1} later`}><ArrowDown size={17}/></button>
        <button onClick={onRemove} disabled={count === 1} aria-label={`Remove block ${index + 1}`}><Trash2 size={17}/></button>
      </div>
    </header>
    <div className="block-fields">
      <label className="skill-field"><span>Skill</span><select value={block.skillId} onChange={(event) => onChange({ skillId: event.currentTarget.value, drillId: '', videoId: '' })}>
        <option value="">Select a skill</option>
        {skillGroups.map(({ topic, skills }) => <optgroup key={topic.id} label={topic.name}>{skills.map((skill) => <option value={skill.id} key={skill.id}>{skill.name}</option>)}</optgroup>)}
      </select></label>
      <label className="duration-field"><span>{mode === 'manual' ? 'Actual minutes' : 'Target minutes'}</span><input className="input" type="number" inputMode="numeric" min="1" max="180" value={block.minutes} onChange={(event) => onChange({ minutes: Number(event.currentTarget.value) })}/></label>
      <label><span>Drill <small>optional, linked to skill</small></span><select disabled={!block.skillId || options.isLoading} value={block.drillId} onChange={(event) => onChange({ drillId: event.currentTarget.value })}><option value="">{options.isLoading ? 'Loading drills…' : 'No drill selected'}</option>{options.data?.drills.map((drill) => <option key={drill.id} value={drill.id}>{drill.title}</option>)}</select></label>
      <label><span>Reference video <small>optional, linked to skill</small></span><select disabled={!block.skillId || options.isLoading} value={block.videoId} onChange={(event) => onChange({ videoId: event.currentTarget.value })}><option value="">{options.isLoading ? 'Loading videos…' : 'No video selected'}</option>{options.data?.videos.map((video) => <option key={video.id} value={video.id}>{video.title}</option>)}</select></label>
      {block.skillId && options.data && options.data.drills.length === 0 && <div className="quick-drill-create">
        <span><Link2 size={16}/> No drill linked to this skill yet.</span>
        <input className="input" value={drillTitle} maxLength={200} placeholder="Name a simple drill" onChange={(event) => setDrillTitle(event.currentTarget.value)}/>
        <button className="button secondary" disabled={!drillTitle.trim() || createDrill.isPending} onClick={async () => {
          try {
            const drill = await createDrill.mutateAsync({ title: drillTitle.trim(), skillNodeId: options.data!.skill.nodeId })
            onChange({ drillId: drill.id })
            setDrillTitle('')
            toast.success('Drill created and linked')
          } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not create drill') }
        }}>{createDrill.isPending ? 'Creating…' : 'Create drill'}</button>
      </div>}
      {block.skillId && options.data && options.data.videos.length === 0 && <p className="attachment-hint"><Link2 size={16}/> No linked videos yet. Link a tutorial to this skill from Library.</p>}
      <label className="focus-field"><span>{mode === 'manual' ? 'Training note' : 'Focus cue'} <small>optional</small></span><input className="input" value={block.focusNote} maxLength={500} placeholder="Stay low, recover after every ball…" onChange={(event) => onChange({ focusNote: event.currentTarget.value })}/></label>
      {mode === 'manual' && <label><span>Confidence after training <small>optional</small></span><select value={block.confidence} onChange={(event) => onChange({ confidence: event.currentTarget.value })}><option value="">No check-in</option><option value="1">1 · Not clicking yet</option><option value="2">2 · Starting to click</option><option value="3">3 · Repeatable in drills</option><option value="4">4 · Reliable under pressure</option><option value="5">5 · Match ready</option></select></label>}
    </div>
  </article>
}
