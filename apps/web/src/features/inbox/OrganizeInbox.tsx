import { useMemo, useState } from 'react'
import { Check, ChevronRight, Layers3, Target } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog, Dialog } from '../../components/Dialog'
import { FacebookEmbed } from '../../components/FacebookEmbed'
import { VideoThumbnail } from '../../components/VideoThumbnail'
import { useConvertInbox, useDeleteInbox, useInboxItem, useLibraryOverview } from '../../lib/api/hooks'

export function OrganizeInbox({ id, navigate, quick = false }: { id: string; navigate: (to: string) => void; quick?: boolean }) {
  const item = useInboxItem(id)
  const overview = useLibraryOverview()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [picker, setPicker] = useState<'topics' | 'skills' | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const convert = useConvertInbox(id)
  const remove = useDeleteInbox(id)

  const topics = overview.data?.topics.filter((topic) => !topic.isHidden) ?? []
  const skills = overview.data?.skills ?? []
  const visibleSkills = useMemo(() => selectedTopicIds.length
    ? skills.filter((skill) => !skill.topicId || selectedTopicIds.includes(skill.topicId))
    : skills, [skills, selectedTopicIds])

  async function submit() {
    try {
      const result = await convert.mutateAsync({
        title: title || item.data?.sharedTitle || undefined,
        quickNote: note || undefined,
        topicIds: selectedTopicIds,
        skillIds: selectedSkillIds,
        tagIds: [],
      })
      toast.success(result.alreadyConverted ? 'Already organized' : 'Saved as Video')
      navigate(`/videos/${result.video.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not convert')
    }
  }

  async function discard() {
    try {
      await remove.mutateAsync()
      toast.success('Inbox item discarded')
      setConfirmDiscard(false)
      navigate('/inbox')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not discard item')
    }
  }

  function toggleTopic(topicId: string) {
    setSelectedTopicIds((current) => {
      const next = current.includes(topicId) ? current.filter((id) => id !== topicId) : [...current, topicId]
      setSelectedSkillIds((selected) => selected.filter((skillId) => {
        const skill = skills.find((candidate) => candidate.id === skillId)
        return next.length === 0 || !skill?.topicId || next.includes(skill.topicId)
      }))
      return next
    })
  }

  const data = item.data
  const displayTitle = data?.sharedTitle || 'Shared video'
  const isFacebook = data?.sourcePlatform === 'facebook'

  return (
    <section>
      {item.isLoading && <div className="card">Loading…</div>}
      {item.isError && <div className="notice">This Inbox capture could not be loaded.</div>}
      {data && <>
        {quick && <div className="notice success">Saved to Inbox. Add learning context now, or return later.</div>}
        <div className="card">
          {isFacebook
            ? <FacebookEmbed sourceUrl={data.canonicalUrl ?? data.sourceUrl} title={displayTitle} />
            : <VideoThumbnail src={data.thumbnailUrl} title={displayTitle} />}
          <span className="pill">{data.sourcePlatform}</span>
          <h2>{displayTitle}</h2>
          {data.creatorName && <p className="muted">By {data.creatorName}</p>}
          <p className="muted">{data.sourceUrl || 'Needs URL correction before a Video can be created.'}</p>
          {isFacebook && <p className="notice">Public Facebook videos and posts can be played here when Facebook permits embedding. The original link remains available as a fallback.</p>}
          {quick && <div className="quick-actions">
            <button className="button secondary" onClick={() => navigate('/inbox')}>Done</button>
            <button className="button danger" disabled={remove.isPending} onClick={() => setConfirmDiscard(true)}>Discard capture</button>
          </div>}
        </div>

        <div className="card organize-fields">
          <label>Video title<input className="input" value={title} placeholder={data.sharedTitle ?? 'Title'} onChange={(event) => setTitle(event.currentTarget.value)} /></label>
          <label>Quick note<textarea rows={4} value={note} onChange={(event) => setNote(event.currentTarget.value)} placeholder="Why is this useful?" /></label>

          <div className="organize-associations">
            <label>
              Topics <small>optional</small>
              <button type="button" className="choice-trigger" onClick={() => setPicker('topics')}>
                <span><strong>{selectedTopicIds.length ? `${selectedTopicIds.length} selected` : 'Choose topics'}</strong><small>Learning areas for this video</small></span>
                <><Layers3 size={18} /><ChevronRight size={17} /></>
              </button>
            </label>
            <label>
              Skills <small>optional</small>
              <button type="button" className="choice-trigger" onClick={() => setPicker('skills')}>
                <span><strong>{selectedSkillIds.length ? `${selectedSkillIds.length} selected` : 'Choose skills'}</strong><small>{selectedTopicIds.length ? 'Filtered by selected topics' : 'All available skills'}</small></span>
                <><Target size={18} /><ChevronRight size={17} /></>
              </button>
            </label>
          </div>

          {(selectedTopicIds.length > 0 || selectedSkillIds.length > 0) && <div className="selection-summary" aria-label="Selected learning context">
            {selectedTopicIds.map((topicId) => <span key={topicId}>{topics.find((topic) => topic.id === topicId)?.name}</span>)}
            {selectedSkillIds.map((skillId) => <span key={skillId}>{skills.find((skill) => skill.id === skillId)?.name}</span>)}
          </div>}

          <button className="button" onClick={submit} disabled={convert.isPending || overview.isLoading || !data.sourceUrl}>{convert.isPending ? 'Saving…' : 'Save as Video'}</button>
        </div>
      </>}

      {picker === 'topics' && <MultiChoiceDialog
        title="Choose topics"
        eyebrow="Learning areas"
        options={topics.map((topic) => ({ id: topic.id, name: topic.name, detail: topic.description ?? undefined }))}
        selected={selectedTopicIds}
        onToggle={toggleTopic}
        onClose={() => setPicker(null)}
      />}
      {picker === 'skills' && <MultiChoiceDialog
        title="Choose skills"
        eyebrow={selectedTopicIds.length ? 'Matching selected topics' : 'All skills'}
        options={visibleSkills.map((skill) => ({ id: skill.id, name: skill.name, detail: topics.find((topic) => topic.id === skill.topicId)?.name }))}
        selected={selectedSkillIds}
        onToggle={(skillId) => setSelectedSkillIds((current) => current.includes(skillId) ? current.filter((id) => id !== skillId) : [...current, skillId])}
        onClose={() => setPicker(null)}
      />}
      {confirmDiscard && <ConfirmDialog
        title="Discard this capture?"
        message="This permanently removes the Inbox capture. A saved Video is not created."
        confirmLabel="Discard capture"
        pending={remove.isPending}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discard}
      />}
    </section>
  )
}

function MultiChoiceDialog({
  title,
  eyebrow,
  options,
  selected,
  onToggle,
  onClose,
}: {
  title: string
  eyebrow: string
  options: Array<{ id: string; name: string; detail?: string }>
  selected: string[]
  onToggle: (id: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLocaleLowerCase()
  const visible = options.filter((option) => !normalized || option.name.toLocaleLowerCase().includes(normalized) || option.detail?.toLocaleLowerCase().includes(normalized))
  return <Dialog
    title={title}
    eyebrow={eyebrow}
    variant="sheet"
    onClose={onClose}
    footer={<button className="button" onClick={onClose}>Done · {selected.length} selected</button>}
  >
    <input autoFocus className="input choice-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={`Search ${title.toLocaleLowerCase()}`} />
    <div className="choice-list">
      {visible.map((option) => <button type="button" key={option.id} className={`choice-option ${selected.includes(option.id) ? 'selected' : ''}`} aria-pressed={selected.includes(option.id)} onClick={() => onToggle(option.id)}>
        <span className="choice-check"><Check size={17} /></span>
        <span><strong>{option.name}</strong>{option.detail && <small>{option.detail}</small>}</span>
        <small>{selected.includes(option.id) ? 'Selected' : 'Select'}</small>
      </button>)}
      {!visible.length && <div className="empty">No matching options.</div>}
    </div>
  </Dialog>
}
