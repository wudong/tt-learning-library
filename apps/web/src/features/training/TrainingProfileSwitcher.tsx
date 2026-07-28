import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronRight, Pencil, Plus, Save, Trash2, UserPlus, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import type { TrainingProfileDto } from '@ttll/shared'
import { ConfirmDialog, Dialog } from '../../components/Dialog'
import { useMobilePageActions, type MobilePageAction } from '../../components/MobilePageActions'
import {
  useCreateTrainingProfile,
  useDeleteTrainingProfile,
  useTrainingProfiles,
  useUpdateTrainingProfile,
} from '../../lib/api/hooks'
import { setActiveTrainingProfileId, useActiveTrainingProfileId } from '../../lib/trainingProfileSelection'

export function TrainingProfileSwitcher({ onPlan }: { onPlan?: () => void }) {
  const profiles = useTrainingProfiles()
  const activeProfileId = useActiveTrainingProfileId()
  const [open, setOpen] = useState(false)
  const selfProfile = profiles.data?.find((profile) => profile.isSelf)
  const activeProfile = profiles.data?.find((profile) => profile.id === activeProfileId) ?? selfProfile

  useEffect(() => {
    if (!profiles.data?.length || activeProfile) return
    const fallback = selfProfile ?? profiles.data[0]
    if (fallback) setActiveTrainingProfileId(fallback.id)
  }, [profiles.data, activeProfile, selfProfile])

  const mobileActions = useMemo<MobilePageAction[]>(() => {
    const actions: MobilePageAction[] = [{
      id: 'training-profile',
      label: `Switch or manage training player${activeProfile ? `, currently ${activeProfile.displayName}` : ''}`,
      icon: <Users size={18} aria-hidden="true" />,
      text: activeProfile?.isSelf ? 'Me' : activeProfile?.displayName ?? 'Player',
      onPress: () => setOpen(true),
    }]
    if (onPlan) actions.push({
      id: 'plan-training',
      label: 'Plan training',
      icon: <Plus size={21} aria-hidden="true" />,
      tone: 'accent' as const,
      onPress: onPlan,
    })
    return actions
  }, [activeProfile?.displayName, activeProfile?.isSelf, onPlan])
  useMobilePageActions(mobileActions)

  if (profiles.isLoading) return <div className="training-profile-control loading">Loading player…</div>
  if (profiles.isError || !profiles.data?.length) return <div className="notice">We could not load training profiles.</div>

  return <>
    <button className="training-profile-control" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">
      <span className="training-profile-icon"><Users size={20} /></span>
      <span className="training-profile-control-copy">
        <small>Training for</small>
        <strong>{activeProfile?.displayName ?? 'My training'}{activeProfile?.isSelf ? ' · Me' : ''}</strong>
        <em>Switch or manage players</em>
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </button>
    {open && <TrainingProfileDrawer
      profiles={profiles.data}
      activeProfileId={activeProfile?.id ?? ''}
      onClose={() => setOpen(false)}
    />}
  </>
}

export function TrainingProfileDrawer({
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
  const [editingId, setEditingId] = useState('')
  const [editingName, setEditingName] = useState('')
  const [deleting, setDeleting] = useState<TrainingProfileDto | null>(null)

  function choose(profile: TrainingProfileDto) {
    setActiveTrainingProfileId(profile.id)
    toast.success(`Training switched to ${profile.displayName}`)
    onClose()
  }

  async function addPlayer() {
    const displayName = newName.trim()
    if (!displayName) return
    try {
      const profile = await create.mutateAsync({ displayName })
      setNewName('')
      setActiveTrainingProfileId(profile.id)
      toast.success(`${profile.displayName} added and selected`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add player')
    }
  }

  async function saveName(profile: TrainingProfileDto) {
    const displayName = editingName.trim()
    if (!displayName) return
    try {
      await update.mutateAsync({ id: profile.id, displayName })
      setEditingId('')
      setEditingName('')
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
    <Dialog title="Training players" eyebrow="Switch or manage" variant="sheet" onClose={onClose}>
      <p className="training-profile-privacy">Use a nickname or display name only. Profiles stay private to your account and never gain access to your Library.</p>

      <section className="training-profile-drawer-section" aria-labelledby="training-player-list-title">
        <div className="training-profile-drawer-heading">
          <h3 id="training-player-list-title">Choose a player</h3>
          <small>{profiles.length} profile{profiles.length === 1 ? '' : 's'}</small>
        </div>
        <div className="training-profile-list">
          {profiles.map((profile) => {
            const active = profile.id === activeProfileId
            const editing = editingId === profile.id
            return <article key={profile.id} className={active ? 'active' : ''}>
              <span className="training-profile-avatar">{profile.displayName.slice(0, 1).toLocaleUpperCase()}</span>
              {editing ? <div className="training-profile-inline-edit">
                <input autoFocus className="input" value={editingName} maxLength={100} aria-label={`Rename ${profile.displayName}`} onChange={(event) => setEditingName(event.currentTarget.value)} />
                <button className="toolbar-icon" disabled={!editingName.trim() || update.isPending} aria-label="Save profile name" onClick={() => void saveName(profile)}><Save size={17} /></button>
                <button className="toolbar-icon" aria-label="Cancel rename" onClick={() => { setEditingId(''); setEditingName('') }}><X size={17} /></button>
              </div> : <>
                <button className="training-profile-select" onClick={() => choose(profile)}>
                  <span><strong>{profile.displayName}</strong><small>{profile.isSelf ? 'Your personal training' : 'Coach-managed player'}</small></span>
                  {active && <span className="training-profile-active-mark"><Check size={16} /> Active</span>}
                </button>
                <button className="toolbar-icon" aria-label={`Rename ${profile.displayName}`} onClick={() => { setEditingId(profile.id); setEditingName(profile.displayName) }}><Pencil size={17} /></button>
                {!profile.isSelf && <button className="toolbar-icon danger" aria-label={`Remove ${profile.displayName}`} onClick={() => setDeleting(profile)}><Trash2 size={17} /></button>}
              </>}
            </article>
          })}
        </div>
      </section>

      <section className="training-profile-drawer-section training-profile-create" aria-labelledby="add-training-player-title">
        <div className="training-profile-drawer-heading"><h3 id="add-training-player-title">Add a player</h3></div>
        <label><span>Player name or nickname</span><input className="input" value={newName} maxLength={100} placeholder="For example, Alex" onChange={(event) => setNewName(event.currentTarget.value)} /></label>
        <button className="button" disabled={!newName.trim() || create.isPending} onClick={() => void addPlayer()}><UserPlus size={17} /> Add and select</button>
      </section>
    </Dialog>
    {deleting && <ConfirmDialog
      title={`Remove ${deleting.displayName}?`}
      message="A player profile can only be removed when it has no training sessions. Existing training history is never deleted silently."
      confirmLabel="Remove player"
      pending={remove.isPending}
      onClose={() => setDeleting(null)}
      onConfirm={deleteProfile}
    />}
  </>
}
