import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateNote } from '../lib/api/hooks'
import { PictureAttachments } from './PictureAttachments'

type NoteTarget = {
  nodeId: string
  title: string
  type: 'topic' | 'skill' | 'drill' | 'video'
}

export function NodeNoteComposer({ target, onClose }: { target: NoteTarget; onClose: () => void }) {
  const create = useCreateNote()
  const [body, setBody] = useState('')
  const [noteType, setNoteType] = useState<'plain' | 'takeaway' | 'question' | 'reminder'>('plain')

  async function save() {
    try {
      await create.mutateAsync({ parentNodeId: target.nodeId, body, noteType })
      toast.success(`Note added to ${target.title}`)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save note')
    }
  }

  return (
    <div className="context-editor-layer" role="dialog" aria-modal="true" aria-labelledby="node-note-title">
      <button className="context-editor-scrim" aria-label="Close note editor" onClick={onClose} />
      <div className="note-composer">
        <header>
          <div>
            <span className="eyebrow">Personal {target.type} note</span>
            <h2 id="node-note-title">{target.title}</h2>
          </div>
          <button className="toolbar-icon" onClick={onClose} aria-label="Close"><X /></button>
        </header>
        <div className="note-composer-body stack">
          <label>
            Note type
            <select value={noteType} onChange={(event) => setNoteType(event.currentTarget.value as typeof noteType)}>
              <option value="plain">Note</option>
              <option value="takeaway">Takeaway</option>
              <option value="question">Question</option>
              <option value="reminder">Reminder</option>
            </select>
          </label>
          <label>
            Your note
            <textarea
              rows={6}
              autoFocus
              value={body}
              onChange={(event) => setBody(event.currentTarget.value)}
              placeholder={`What do you want to remember about ${target.title}?`}
            />
          </label>
          <PictureAttachments parentNodeId={target.nodeId} />
        </div>
        <footer>
          <button className="button secondary" onClick={onClose}>Cancel</button>
          <button className="button" disabled={!body.trim() || create.isPending} onClick={save}>{create.isPending ? 'Saving…' : 'Save note'}</button>
        </footer>
      </div>
    </div>
  )
}
