import { useState } from 'react'
import { Mail, Target } from 'lucide-react'
import { supabase } from '../lib/auth/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const shared = new URLSearchParams(location.search).get('shared') === '1'

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

  return (
    <main className="login-page">
      <section className="login-card">
        <span className="brand-mark"><Target size={24} /></span>
        <div><span className="eyebrow">Private learning library</span><h1>Sign in to TT Learn</h1></div>
        {shared && <p className="notice">Your shared video is waiting. Sign in to save it privately.</p>}
        {sent ? (
          <div className="notice success"><strong>Check your email</strong><br />Use the secure link, then return to TT Learn to continue.</div>
        ) : (
          <form className="stack" onSubmit={submit}>
            <label>Email address<input className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button" disabled={pending}>{pending ? 'Sending…' : <><Mail size={18} /> Email me a sign-in link</>}</button>
          </form>
        )}
        <p className="muted">Your videos, notes, and practice graph remain private to your account.</p>
      </section>
    </main>
  )
}
