import { useState } from 'react'
import { ExternalLink, Target } from 'lucide-react'
import { getAndroidPwaHandoffUrl } from '../lib/auth/supabase'

export function AndroidPwaHandoff() {
  const [dismissed, setDismissed] = useState(false)
  const [handoffUrl] = useState(getAndroidPwaHandoffUrl)

  if (!handoffUrl || dismissed) return null

  const stayInBrowser = () => {
    history.replaceState({}, '', `${location.pathname}${location.search}`)
    setDismissed(true)
  }

  return (
    <main className="android-handoff-page">
      <section className="android-handoff-card" aria-labelledby="android-handoff-title">
        <span className="brand-mark"><Target size={24} /></span>
        <div>
          <span className="eyebrow">Sign-in complete</span>
          <h1 id="android-handoff-title">Continue in TT Learn</h1>
          <p>Your Android device can now return this signed-in session to the installed app.</p>
        </div>
        <a className="button android-handoff-open" href={handoffUrl}>
          Open installed app <ExternalLink size={18} aria-hidden="true" />
        </a>
        <button className="button secondary" type="button" onClick={stayInBrowser}>Stay in browser</button>
      </section>
    </main>
  )
}
