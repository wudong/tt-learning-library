import { useState } from 'react'
import { Check, Layers3 } from 'lucide-react'
import { Dialog } from './Dialog'

export type TopicPickerOption = {
  id: string
  name: string
  description?: string | null
}

export function TopicPickerDialog({
  topics,
  selectedIds,
  onChange,
  onClose,
  title = 'Choose Topics',
  eyebrow = 'Learning areas',
  multiple = true,
  clearLabel,
}: {
  topics: TopicPickerOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  onClose: () => void
  title?: string
  eyebrow?: string
  multiple?: boolean
  clearLabel?: string
}) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLocaleLowerCase()
  const visible = topics.filter((topic) =>
    !normalized
    || topic.name.toLocaleLowerCase().includes(normalized)
    || topic.description?.toLocaleLowerCase().includes(normalized)
  )

  function choose(topicId: string) {
    if (!multiple) {
      onChange([topicId])
      onClose()
      return
    }
    onChange(selectedIds.includes(topicId)
      ? selectedIds.filter((id) => id !== topicId)
      : [...selectedIds, topicId])
  }

  return <Dialog
    title={title}
    eyebrow={eyebrow}
    variant="sheet"
    onClose={onClose}
    footer={multiple
      ? <button className="button" onClick={onClose}>Done · {selectedIds.length} selected</button>
      : clearLabel
        ? <button className="button secondary" onClick={() => { onChange([]); onClose() }}>{clearLabel}</button>
        : undefined}
  >
    <label className="choice-search-label">
      <span className="sr-only">Search Topics</span>
      <Layers3 size={17} aria-hidden="true" />
      <input autoFocus className="input choice-search" type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search Topics" />
    </label>
    <div className="choice-list">
      {visible.map((topic) => {
        const selected = selectedIds.includes(topic.id)
        return <button type="button" key={topic.id} className={`choice-option ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => choose(topic.id)}>
          <span className="choice-check"><Check size={17} /></span>
          <span><strong>{topic.name}</strong>{topic.description && <small>{topic.description}</small>}</span>
          <small>{selected ? 'Selected' : multiple ? 'Select' : 'Choose'}</small>
        </button>
      })}
      {!visible.length && <div className="empty">No Topics match this search.</div>}
    </div>
  </Dialog>
}
