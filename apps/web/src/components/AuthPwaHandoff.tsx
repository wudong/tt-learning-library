import { useState } from 'react'
import { Check, Copy, ExternalLink, Target } from 'lucide-react'
import { getAuthHandoff } from '../lib/auth/supabase'

export function AuthPwaHandoff() {
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [handoff] = useState(getAuthHandoff)

  if (!handoff || dismissed) return null

  const stayInBrowser = () => {
    history.replaceState({}, '', `${location.pathname}${location.search}`)
    setDismissed(true)
  }

  const copyForIos = async () => {
    try {
      await navigator.clipboard.writeText(handoff.url)
      setCopied(true)
      setCopyError(false)
    } catch {
      setCopyError(true)
    }
  }

  return (
    <main className="auth-handoff-page">
      <section className="auth-handoff-card" aria-labelledby="auth-handoff-title">
        <span className="brand-mark"><Target size={24} /></span>
        <div>
          <span className="eyebrow">Sign-in complete</span>
          <h1 id="auth-handoff-title">Continue in TT Learn</h1>
          <p>{handoff.platform === 'android'
            ? 'Your Android device can now return this signed-in session to the installed app.'
            : 'Copy the secure sign-in link, open the installed TT Learn app, then choose Paste sign-in link.'}</p>
        </div>
        {handoff.platform === 'android' ? (
          <a className="button auth-handoff-open" href={handoff.url}>
            Open installed app <ExternalLink size={18} aria-hidden="true" />
          </a>
        ) : (
          <button className="button" type="button" onClick={() => void copyForIos()}>
            {copied ? <><Check size={18} aria-hidden="true" /> Copied</> : <><Copy size={18} aria-hidden="true" /> Copy sign-in link</>}
          </button>
        )}
        {copyError && <p className="form-error" role="alert">Could not access the clipboard. Try opening the link in Safari.</p>}
        <button className="button secondary" type="button" onClick={stayInBrowser}>Stay in browser</button>
      </section>
    </main>
  )
}
