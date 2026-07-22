import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { usePwa } from '../lib/pwa/PwaProvider'

export function AppUpdatePrompt() {
  const { updateAvailable, applyUpdate } = usePwa()
  const [dismissed, setDismissed] = useState(false)
  const [isApplying, setApplying] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (updateAvailable) setDismissed(false)
  }, [updateAvailable])

  if (!updateAvailable || dismissed) return null

  const update = async () => {
    setApplying(true)
    setError(false)
    try {
      await applyUpdate()
    } catch {
      setError(true)
      setApplying(false)
    }
  }

  return (
    <aside className="app-update-prompt" role="status" aria-live="polite" aria-label="App update available">
      <div className="app-update-icon" aria-hidden="true"><RefreshCw size={20} /></div>
      <div className="app-update-copy">
        <strong>New version ready</strong>
        <span>{error
          ? 'Update failed. Check your connection and try again.'
          : 'Update TT Learn to get the latest improvements.'}</span>
      </div>
      <div className="app-update-actions">
        <button className="button app-update-now" disabled={isApplying} onClick={() => void update()}>
          {isApplying ? 'Updating…' : 'Update now'}
        </button>
        <button className="app-update-later" onClick={() => setDismissed(true)} aria-label="Remind me about this update later">
          <X size={19} aria-hidden="true" />
          <span>Later</span>
        </button>
      </div>
    </aside>
  )
}
