import { UserRound } from 'lucide-react'
import { useTrainingSession } from '../../lib/api/hooks'

export function TrainingSessionProfileLabel({ id }: { id: string }) {
  const session = useTrainingSession(id)
  const profile = session.data?.session.profile
  if (!profile) return null
  return <div className="training-session-profile" aria-label={`Training for ${profile.displayName}`}>
    <UserRound size={18} />
    <span>Training for</span>
    <strong>{profile.displayName}{profile.isSelf ? ' · Me' : ''}</strong>
  </div>
}
