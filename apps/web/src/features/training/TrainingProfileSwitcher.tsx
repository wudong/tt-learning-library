import { useEffect, useState } from 'react'
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { TrainingProfileDto } from '@ttll/shared'
import { ConfirmDialog, Dialog } from '../../components/Dialog'
import {
  useCreateTrainingProfile,
  useDeleteTrainingProfile,
  useTrainingProfiles,
  useUpdateTrainingProfile,
} from '../../lib/api/hooks'
import { setActiveTrainingProfileId, useActiveTrainingProfileId } from '../../lib/trainingProfileSelection'

export function TrainingProfileSwitcher() {
  const profiles = useTrainingProfiles()
  const activeProfileId = useActiveTrainingProfileId()
  const [managing, setManaging] = useState(false)
  const selfProfile = profiles.data?.find((profile) => profile.isSelf)
  const activeProfile = profiles.data?.find((profile) => profile.id === activeProfileId) ?? selfProfile

  useEffect(() => {
    if (!profiles.data?.length || activeProfile) return
    const fallback = selfProfile ?? profiles.data[0]
    if (fallback) setActiveTrainingProfileId(fallback.id)
  }, [profiles.data, activeProfile, selfProfile])

  if (profiles.isLoading) return <div className="training-profile-switcher loading">Loading player…</div>
  if (profiles.isError || !profiles.data?.length) return <div className="notice">We could not load training profiles.</div>

  return <section className="training-profile-switcher" aria-label="Active training player">
    <span className="training-profile-icon"><Users size={20} /></span>
    <label>
      <span>Training for</span>
      <select
        value={activeProfile?.id ?? ''}
        onChange={(event) => setActiveTrainingProfileId(event.currentTarget.value)}
      >
        {profiles.data.map((profile) => <option key={profile.id} value={profile.id}>
          {profile.displayName}{profile.isSelf ? ' · Me' : ''}
        </option>)}
      </select>
    </label>
    <button className="button secondary" type="button" onClick={() => setManaging(true)}>Manage players</button>
    {managing && <TrainingProfileManager
      profiles={profiles.data}
      activeProfileId={activeProfile?.id ?? ''}
      onClose={() => setManaging(false)}
    />}
  </section>
}

function TrainingProfileManager({
  profiles,
  activeProfileId,
  onClose,
}: {
  profiles: TrainingProfileDto[]
  activeProfileId: string
  onClose: () => void
}) {
  const create = useCreateTrainingProfile()
  const update = useUpdateTrainingProfile()
  const remove = useDeleteTrainingProfile()
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<TrainingProfileDto | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleting, setDeleting] = useState<TrainingProfileDto | null>(null)

  async function addPlayer() {
    const displayName = newName.trim()
    if (!displayName) return
    try {
      const profile = await create.mutateAsync({ displayName })
      setNewName('')
      setActiveTrainingProfileId(profile.id)
      toast.success(`${profile.displayName} added`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add player')
    }
  }

  async function saveName() {
    if (!editing || !editingName.trim()) return
    try {
      await update.mutateAsync({ id: editing.id, displayName: editingName.trim() })
      setEditing(null)
      toast.success('Profile name updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update profile')
    }
  }

  async function deleteProfile() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      if (activeProfileId === deleting.id) {
        const fallback = profiles.find((profile) => profile.isSelf)
        setActiveTrainingProfileId(fallback?.id ?? '')
      }
      toast.success(`${deleting.displayName} removed`)
      setDeleting(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove profile')
    }
  }

  return <>
    <Dialog title="Manage training players" eyebrow="Coach workspace" variant="sheet" onClose={onClose}>
      <p className="training-profile-privacy">Use a nickname or display name only. Player profiles are private to your account, have no login, and do not gain access to your Library.</p>
      <div className="training-profile-create">
        <label><span>New player</span><input className="input" value={newName} maxLength={100} placeholder="Player name or nickname" onChange={(event) => setNewName(event.currentTarget.value)} /></label>
        <button className="button" disabled={!newName.trim() || create.isPending} onClick={() => void addPlayer()}><UserPlus size={17} /> Add player</button>
      </div>
      <div className="training-profile-list">
        {profiles.map((profile) => <article key={profile.id} className={profile.id === activeProfileId ? 'active' : ''}>
          <span className="training-profile-avatar">{profile.displayName.slice(0, 1).toLocaleUpperCase()}</span>
          <div><strong>{profile.displayName}</strong><small>{profile.isSelf ? 'Your personal training' : 'Coach-managed player'}{profile.id === activeProfileId ? ' · Active' : ''}</small></div>
          <button className="toolbar-icon" aria-label={`Rename ${profile.displayName}`} onClick={() => { setEditing(profile); setEditingName(profile.displayName) }}><Pencil size={17} /></button>
          {!profile.isSelf && <button className="toolbar-icon danger" aria-label={`Remove ${profile.displayName}`} onClick={() => setDeleting(profile)}><Trash2 size={17} /></button>}
        </article>)}
      </div>
    </Dialog>
    {editing && <Dialog title="Rename training profile" eyebrow={editing.isSelf ? 'Personal training' : 'Player'} onClose={() => setEditing(null)} footer={<>
      <button className="button secondary" onClick={() => setEditing(null)}>Cancel</button>
      <button className="button" disabled={!editingName.trim() || update.isPending} onClick={() => void saveName()}>Save name</button>
    </>}>
      <label><span>Display name</span><input autoFocus className="input" value={editingName} maxLength={100} onChange={(event) => setEditingName(event.currentTarget.value)} /></label>
    </Dialog>}
    {deleting && <ConfirmDialog
      title={`Remove ${deleting.displayName}?`}
      message="A player profile can only be removed when it has no training sessions. This never deletes another player’s history silently."
      confirmLabel="Remove player"
      pending={remove.isPending}
      onClose={() => setDeleting(null)}
      onConfirm={deleteProfile}
    />}
  </>
}
