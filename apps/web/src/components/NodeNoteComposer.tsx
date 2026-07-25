import { useState } from 'react'
import { toast } from 'sonner'
import { useCreateNote } from '../lib/api/hooks'
import { Dialog } from './Dialog'
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

  return <Dialog
    title={target.title}
    eyebrow={`Personal ${target.type} note`}
    variant="sheet"
    onClose={onClose}
    closeLabel="Close note editor"
    footer={<>
      <button className="button secondary" onClick={onClose}>Cancel</button>
      <button className="button" disabled={!body.trim() || create.isPending} onClick={save}>{create.isPending ? 'Saving…' : 'Save note'}</button>
    </>}
  >
    <div className="stack">
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
  </Dialog>
}
