import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarPlus, Check, CircleStop, Clock3, Copy, ExternalLink, Pause, Play, Plus, RotateCcw, SkipForward, Trash2, Video } from 'lucide-react'
import { toast } from 'sonner'
import type { TrainingSessionDetailDto } from '@ttll/shared'
import { VideoThumbnail } from '../../components/VideoThumbnail'
import { useCompleteTrainingSession, useCopyTrainingSession, useDeleteTrainingSession, useLibraryOverview, useReplaceTrainingBlocks, useStartTrainingSession, useTrainingPracticeOptions, useTrainingSession, useTransitionTrainingBlock } from '../../lib/api/hooks'

const clock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const remainder = safe % 60
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${minutes}:${String(remainder).padStart(2, '0')}`
}
const minutes = (seconds: number) => `${Math.round(seconds / 60)} min`

export function TrainingSessionPage({ id, run, navigate }: { id: string; run: boolean; navigate: (to: string) => void }) {
  const query = useTrainingSession(id)
  const start = useStartTrainingSession(id)
  const transition = useTransitionTrainingBlock(id)
  const complete = useCompleteTrainingSession(id)
  const copy = useCopyTrainingSession(id)
  const remove = useDeleteTrainingSession()
  const [now, setNow] = useState(Date.now())
  const [alertedTarget, setAlertedTarget] = useState('')
  const [showFinish, setShowFinish] = useState(false)
  const [showRemaining, setShowRemaining] = useState(false)
  const [copyDate, setCopyDate] = useState(new Date().toLocaleDateString('en-CA'))
  const data = query.data
  const active = data?.blocks.find((block) => block.status === 'active')
  const current = active ?? data?.blocks.find((block) => block.status === 'paused') ?? data?.blocks.find((block) => block.status === 'planned')
  const liveActual = current ? current.actualDurationSeconds + (current.status === 'active' ? Math.max(0, Math.floor((now - query.dataUpdatedAt) / 1000)) : 0) : 0
  const targetReached = !!current?.plannedDurationSeconds && liveActual >= current.plannedDurationSeconds

  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active?.id])

  useEffect(() => {
    if (!active) return
    let lock: { release: () => Promise<void> } | undefined
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
    wakeLock?.request('screen').then((value) => { lock = value }).catch(() => undefined)
    return () => { lock?.release().catch(() => undefined) }
  }, [active?.id])

  useEffect(() => {
    if (!current || !targetReached) return
    const key = `${current.id}:${current.plannedDurationSeconds}`
    if (alertedTarget === key) return
    setAlertedTarget(key)
    navigator.vibrate?.([180, 100, 180])
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        const context = new AudioContextClass()
        const oscillator = context.createOscillator()
        oscillator.frequency.value = 740
        oscillator.connect(context.destination)
        oscillator.start()
        oscillator.stop(context.currentTime + 0.16)
      }
    } catch { /* Browser audio remains best effort. */ }
  }, [current?.id, current?.plannedDurationSeconds, targetReached, alertedTarget])

  async function act(action: 'start'|'pause'|'resume'|'complete'|'skip'|'add_time', additionalSeconds?: number) {
    if (!current) return
    try { await transition.mutateAsync({ blockId: current.id, action, additionalSeconds }) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update the timer') }
  }

  if (query.isLoading) return <section><div className="library-skeleton">Loading training session…</div></section>
  if (query.isError || !data) return <section><div className="notice">We could not load this training session.</div></section>
  if (run && data.session.status !== 'completed') return <LiveSession
    data={data}
    current={current}
    liveActual={liveActual}
    targetReached={targetReached}
    pending={transition.isPending || start.isPending}
    onStartSession={async () => { try { await start.mutateAsync() } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not start session') } }}
    onAction={act}
    onFinish={() => setShowFinish(true)}
    onEditRemaining={() => setShowRemaining(true)}
  >
    {showFinish && <FinishPanel data={data} pending={complete.isPending} onCancel={() => setShowFinish(false)} onComplete={async (body) => {
      try { await complete.mutateAsync(body); toast.success('Training session complete'); setShowFinish(false); navigate(`/training/${id}`) }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Could not finish training') }
    }}/>}
    {showRemaining && <RemainingEditor data={data} onClose={() => setShowRemaining(false)}/>}
  </LiveSession>

  return <section className="session-detail-page">
    <header className="session-detail-head">
      <div><span className="eyebrow">{data.session.entryMode === 'manual' ? 'Manual training log' : data.session.status === 'completed' ? 'Training complete' : 'Planned session'}</span><h1>{data.session.title}</h1><p>{new Date(`${data.session.scheduledDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
      <span className={`session-status-badge ${data.session.status}`}>{data.session.status.replace('_', ' ')}</span>
    </header>

    <dl className="session-totals">
      <div><dt>Planned</dt><dd>{minutes(data.session.plannedDurationSeconds)}</dd></div>
      <div><dt>Actual</dt><dd>{minutes(data.session.actualDurationSeconds)}</dd></div>
      <div><dt>Blocks</dt><dd>{data.blocks.filter((block) => block.status === 'completed').length}/{data.blocks.length}</dd></div>
      <div><dt>Rating</dt><dd>{data.session.overallRating ? `${data.session.overallRating}/5` : 'Not rated'}</dd></div>
    </dl>

    <div className="session-block-list">
      {data.blocks.map((block) => <div className="session-block-row" key={block.id}>
        <span className={`block-status-icon ${block.status}`}>{block.status === 'completed' ? <Check size={18}/> : block.position + 1}</span>
        <div><strong>{block.skill.title}</strong><small>{block.drill?.title ?? block.focusNote ?? 'Skill practice'}{block.video ? ` · ${block.video.title}` : ''}</small></div>
        <span><strong>{minutes(block.actualDurationSeconds)}</strong><small>of {block.plannedDurationSeconds ? minutes(block.plannedDurationSeconds) : 'manual'}</small></span>
      </div>)}
    </div>

    {data.session.reflection && <div className="session-reflection"><span className="eyebrow">Reflection</span><p>{data.session.reflection}</p></div>}
    {data.checkins.length > 0 && <div className="checkin-summary"><span className="eyebrow">Skill confidence</span>{data.checkins.map((checkin) => <div key={checkin.skillId}><strong>{data.blocks.find((block) => block.skillId === checkin.skillId)?.skill.title}</strong><span>{checkin.confidenceRating ? `${checkin.confidenceRating}/5` : 'No rating'}</span></div>)}</div>}

    <div className="session-detail-actions">
      {data.session.status !== 'completed' && <button className="button" onClick={() => navigate(`/training/${id}/run`)}><Play size={18}/> Start training</button>}
      <label className="copy-date"><span>Copy to</span><input type="date" value={copyDate} onChange={(event) => setCopyDate(event.currentTarget.value)}/></label>
      <button className="button secondary" disabled={copy.isPending} onClick={async () => {
        try { const result = await copy.mutateAsync({ scheduledDate: copyDate, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }); toast.success('Plan copied'); navigate(`/training/${result.session.id}`) }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Could not copy plan') }
      }}><Copy size={18}/> Copy plan</button>
      <button className="button danger" disabled={remove.isPending} onClick={async () => {
        if (!window.confirm('Remove this training session and its private history?')) return
        try { await remove.mutateAsync(id); toast.success('Training session removed'); navigate('/training') }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Could not remove session') }
      }}><Trash2 size={18}/> Remove</button>
    </div>
  </section>
}

function LiveSession({
  data,
  current,
  liveActual,
  targetReached,
  pending,
  onStartSession,
  onAction,
  onFinish,
  onEditRemaining,
  children,
}: {
  data: TrainingSessionDetailDto
  current: TrainingSessionDetailDto['blocks'][number] | undefined
  liveActual: number
  targetReached: boolean
  pending: boolean
  onStartSession: () => Promise<void>
  onAction: (action: 'start'|'pause'|'resume'|'complete'|'skip'|'add_time', seconds?: number) => Promise<void>
  onFinish: () => void
  onEditRemaining: () => void
  children: React.ReactNode
}) {
  const options = useTrainingPracticeOptions(current?.skillId ?? '')
  const completed = data.blocks.filter((block) => block.status === 'completed' || block.status === 'skipped').length
  if (!current) return <section className="live-session">
    <div className="training-empty"><Check size={30}/><strong>All blocks are accounted for</strong><span>Add a quick reflection, or finish immediately.</span><button className="button" onClick={onFinish}>Finish session</button></div>
    {children}
  </section>
  return <section className="live-session">
    <header className="live-head">
      <div><span className="eyebrow">Block {current.position + 1} of {data.blocks.length}</span><h1>{current.skill.title}</h1><p>{completed} blocks complete · {data.session.title}</p></div>
      <button className="button secondary" onClick={onEditRemaining}>Edit remaining</button>
    </header>

    <div className="live-timer" aria-live="off">
      <span>{current.status === 'active' ? 'Training now' : current.status === 'paused' ? 'Paused' : data.session.status === 'planned' ? 'Ready to begin' : 'Up next'}</span>
      <strong aria-label={`${Math.floor(liveActual / 60)} minutes ${liveActual % 60} seconds`}>{clock(liveActual)}</strong>
      <small>Target {current.plannedDurationSeconds ? clock(current.plannedDurationSeconds) : 'open'}</small>
      <div className="timer-progress" aria-hidden="true"><span style={{ width: `${Math.min(100, current.plannedDurationSeconds ? liveActual / current.plannedDurationSeconds * 100 : 0)}%` }}/></div>
    </div>

    {targetReached && current.status === 'active' && <div className="time-up-panel" role="status">
      <Clock3 size={24}/>
      <div><strong>Target time reached</strong><span>Choose what happens next. Nothing advances automatically.</span></div>
      <button className="button" disabled={pending} onClick={() => onAction('complete')}><SkipForward size={18}/> Continue to next</button>
      <button className="button secondary" disabled={pending} onClick={() => onAction('add_time', 300)}><Plus size={18}/> Add 5 min</button>
      <button className="button secondary" onClick={onFinish}><CircleStop size={18}/> Finish session</button>
    </div>}

    <div className="timer-actions">
      {data.session.status === 'planned' && <button className="button" disabled={pending} onClick={onStartSession}><Play size={19}/> Begin session</button>}
      {data.session.status !== 'planned' && current.status === 'planned' && <button className="button" disabled={pending} onClick={() => onAction('start')}><Play size={19}/> Start this skill</button>}
      {current.status === 'active' && <button className="button" disabled={pending} onClick={() => onAction('pause')}><Pause size={19}/> Pause</button>}
      {current.status === 'paused' && <button className="button" disabled={pending} onClick={() => onAction('resume')}><RotateCcw size={19}/> Resume</button>}
      {data.session.status !== 'planned' && <button className="button secondary" disabled={pending} onClick={() => onAction('skip')}><SkipForward size={18}/> Skip</button>}
      <button className="button secondary" onClick={onFinish}><CircleStop size={18}/> Finish</button>
    </div>

    {(current.focusNote || current.drill) && <div className="practice-cue">
      <span className="eyebrow">{current.drill ? 'Drill' : 'Focus cue'}</span>
      <h2>{current.drill?.title ?? current.focusNote}</h2>
      {current.drill?.subtitle && <p>{current.drill.subtitle}</p>}
      {current.drill && current.focusNote && <p><strong>Focus:</strong> {current.focusNote}</p>}
    </div>}

    <div className="training-video-area">
      <div><span className="eyebrow">Reference video</span><h2>{current.video?.title ?? 'No video pinned'}</h2></div>
      {current.video ? <>
        <InlineVideo video={current.video}/>
        <a className="button secondary" href={current.video.sourceUrl ?? '#'} target="_blank" rel="noreferrer"><ExternalLink size={17}/> Open source video</a>
      </> : <p className="muted">This block is ready without a video. Related tutorials appear below when available.</p>}
      {options.data && <div className="related-training-videos"><strong>Other videos for {current.skill.title}</strong>{options.data.videos.filter((video) => video.id !== current.videoId).slice(0, 4).map((video) => <a key={video.id} href={video.sourceUrl ?? '#'} target="_blank" rel="noreferrer"><Video size={17}/><span>{video.title}<small>{video.subtitle}</small></span><ExternalLink size={15}/></a>)}{options.data.videos.length <= (current.video ? 1 : 0) && <span className="muted">No other linked videos.</span>}</div>}
    </div>

    <p className="timer-honesty"><Clock3 size={16}/> Keep this screen open for the reliable time-up alert. Locked-screen alerts depend on browser support.</p>
    {children}
  </section>
}

function InlineVideo({ video }: { video: TrainingSessionDetailDto['blocks'][number]['skill'] }) {
  let youtubeId: string | null = null
  try {
    const url = new URL(video.sourceUrl ?? '')
    if (url.hostname === 'youtu.be') youtubeId = url.pathname.slice(1).split('/')[0] || null
    if (url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com')) youtubeId = url.searchParams.get('v') ?? url.pathname.match(/\/(?:shorts|embed)\/([^/]+)/)?.[1] ?? null
  } catch { youtubeId = null }
  if (youtubeId && /^[A-Za-z0-9_-]{6,32}$/.test(youtubeId)) return <div className="video-embed"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`} title={`Video reference: ${video.title}`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy"/></div>
  return <VideoThumbnail src={video.thumbnailUrl} title={video.title}/>
}

function FinishPanel({ data, pending, onCancel, onComplete }: { data: TrainingSessionDetailDto; pending: boolean; onCancel: () => void; onComplete: (body: { overallRating: number|null; reflection: string|null; checkins: Array<{ skillId: string; confidenceRating: number|null }> }) => Promise<void> }) {
  const [rating, setRating] = useState(data.session.overallRating?.toString() ?? '')
  const [reflection, setReflection] = useState(data.session.reflection ?? '')
  const distinctSkills = useMemo(() => [...new Map(data.blocks.map((block) => [block.skillId, block.skill])).entries()], [data.blocks])
  const [confidence, setConfidence] = useState<Record<string, string>>(() => Object.fromEntries(data.checkins.map((checkin) => [checkin.skillId, checkin.confidenceRating?.toString() ?? ''])))
  return <div className="finish-panel">
    <div><span className="eyebrow">Optional reflection</span><h2>Finish training</h2><p>Skip every field if you just want to save the time.</p></div>
    <label><span>Overall session</span><select value={rating} onChange={(event) => setRating(event.currentTarget.value)}><option value="">No rating</option><option value="1">1 · Rough session</option><option value="2">2 · Difficult</option><option value="3">3 · Solid</option><option value="4">4 · Strong</option><option value="5">5 · Excellent</option></select></label>
    <div className="confidence-list"><strong>Skill confidence</strong>{distinctSkills.map(([skillId, skill]) => <label key={skillId}><span>{skill.title}</span><select value={confidence[skillId] ?? ''} onChange={(event) => setConfidence((current) => ({ ...current, [skillId]: event.currentTarget.value }))}><option value="">No check-in</option><option value="1">1 · Not clicking yet</option><option value="2">2 · Starting to click</option><option value="3">3 · Repeatable in drills</option><option value="4">4 · Reliable under pressure</option><option value="5">5 · Match ready</option></select></label>)}</div>
    <label><span>Reflection</span><textarea rows={4} maxLength={5000} value={reflection} placeholder="What worked, what needs another look…" onChange={(event) => setReflection(event.currentTarget.value)}/></label>
    <div className="finish-actions"><button className="button secondary" onClick={onCancel}>Keep training</button><button className="button" disabled={pending} onClick={() => onComplete({ overallRating: rating ? Number(rating) : null, reflection: reflection.trim() || null, checkins: distinctSkills.filter(([skillId]) => confidence[skillId]).map(([skillId]) => ({ skillId, confidenceRating: Number(confidence[skillId]) })) })}>{pending ? 'Saving…' : 'Finish session'}</button></div>
  </div>
}

function RemainingEditor({ data, onClose }: { data: TrainingSessionDetailDto; onClose: () => void }) {
  const replace = useReplaceTrainingBlocks(data.session.id)
  const overview = useLibraryOverview()
  const [blocks, setBlocks] = useState<Array<{ id?: string; skillId: string; drillId: string|null; videoId: string|null; minutes: number; focusNote: string }>>(() => data.blocks.filter((block) => block.status === 'planned').map((block) => ({ id: block.id, skillId: block.skillId, drillId: block.drillId, videoId: block.videoId, minutes: (block.plannedDurationSeconds ?? 900) / 60, focusNote: block.focusNote ?? '' })))
  const skills = overview.data?.skills ?? []
  const move = (index: number, direction: -1|1) => setBlocks((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next })
  return <div className="remaining-editor">
    <div><span className="eyebrow">Adapt the plan</span><h2>Edit remaining blocks</h2><p>Completed and current blocks stay fixed. Live changes keep the original plan for comparison.</p></div>
    {blocks.map((block, index) => <div className="remaining-row" key={block.id ?? index}>
      <select value={block.skillId} onChange={(event) => setBlocks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, skillId: event.currentTarget.value, drillId: null, videoId: null } : item))}>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select>
      <label><span className="sr-only">Minutes</span><input className="input" type="number" min="1" max="180" value={block.minutes} onChange={(event) => setBlocks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, minutes: Number(event.currentTarget.value) } : item))}/></label>
      <button onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move earlier"><ArrowUp size={17}/></button>
      <button onClick={() => move(index, 1)} disabled={index === blocks.length - 1} aria-label="Move later"><ArrowDown size={17}/></button>
      <button onClick={() => setBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove remaining block"><Trash2 size={17}/></button>
    </div>)}
    <button className="add-block-button" onClick={() => { const skill = skills[0]; if (skill) setBlocks((current) => [...current, { id: undefined, skillId: skill.id, drillId: null, videoId: null, minutes: 15, focusNote: '' }]) }}><Plus size={18}/> Add skill</button>
    <div className="finish-actions"><button className="button secondary" onClick={onClose}>Cancel</button><button className="button" disabled={replace.isPending || blocks.length === 0} onClick={async () => {
      try {
        await replace.mutateAsync({ blocks: blocks.map((block) => ({ id: block.id, skillId: block.skillId, drillId: block.drillId, videoId: block.videoId, plannedDurationSeconds: Math.round(block.minutes * 60), focusNote: block.focusNote })) })
        toast.success('Remaining plan updated')
        onClose()
      } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update remaining plan') }
    }}>{replace.isPending ? 'Saving…' : 'Save changes'}</button></div>
  </div>
}
