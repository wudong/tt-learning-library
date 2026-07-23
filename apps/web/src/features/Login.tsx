import { useState } from 'react'
import { ClipboardPaste, Mail, Target } from 'lucide-react'
import { signInFromHandoffUrl, supabase } from '../lib/auth/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showHandoff, setShowHandoff] = useState(false)
  const [handoffUrl, setHandoffUrl] = useState('')
  const shared = new URLSearchParams(location.search).get('shared') === '1'
  const isInstalledIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setPending(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}${location.pathname}${location.search}` },
    })
    setPending(false)
    if (authError) setError(authError.message)
    else setSent(true)
  }

  async function importHandoff(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await signInFromHandoffUrl(handoffUrl)
      setHandoffUrl('')
      try { await navigator.clipboard.writeText('') } catch { /* Clipboard cleanup is best effort. */ }
    } catch (handoffError) {
      setError(handoffError instanceof Error ? handoffError.message : 'Could not complete sign-in.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <span className="brand-mark"><Target size={24} /></span>
        <div><span className="eyebrow">Private learning library</span><h1>Sign in to TT Learn</h1></div>
        {shared && <p className="notice">Your shared video is waiting. Sign in to save it privately.</p>}
        {showHandoff ? (
          <form className="stack" onSubmit={importHandoff}>
            <p className="notice">Paste the secure link copied from the mail browser. TT Learn will validate it before signing in.</p>
            <label>
              Sign-in link
              <textarea className="input auth-handoff-input" rows={3} required autoCapitalize="none" autoCorrect="off" value={handoffUrl} onChange={(event) => setHandoffUrl(event.currentTarget.value)} />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button" disabled={pending || !handoffUrl.trim()}>{pending ? 'Signing in…' : 'Complete sign-in'}</button>
            <button className="button secondary" type="button" onClick={() => { setShowHandoff(false); setError(null) }}>Back</button>
          </form>
        ) : sent ? (
          <div className="notice success"><strong>Check your email</strong><br />Use the secure link, then return to TT Learn to continue.</div>
        ) : (
          <form className="stack" onSubmit={submit}>
            <label>Email address<input className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button" disabled={pending}>{pending ? 'Sending…' : <><Mail size={18} /> Email me a sign-in link</>}</button>
          </form>
        )}
        {isInstalledIos && !showHandoff && (
          <button className="button secondary" type="button" onClick={() => { setShowHandoff(true); setError(null) }}>
            <ClipboardPaste size={18} aria-hidden="true" /> Paste sign-in link
          </button>
        )}
        <p className="muted">Your videos, notes, and practice graph remain private to your account.</p>
      </section>
    </main>
  )
}
