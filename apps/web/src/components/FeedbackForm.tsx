import { type FormEvent, useEffect, useState } from 'react'
import { Bug, Lightbulb, MessageSquare, Database, CheckCircle, Loader2 } from 'lucide-react'
import { useSubmitFeedback, type FeedbackType } from '../lib/api/feedback'
import { usePwaUpdateGuard } from '../lib/pwa/PwaProvider'

interface FeedbackFormProps {
  variant?: 'quick' | 'full'
  onSubmitted?: () => void
}

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: typeof Bug }[] = [
  { value: 'general', label: 'General', icon: MessageSquare },
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'feature', label: 'Feature', icon: Lightbulb },
  { value: 'data_accuracy', label: 'Data', icon: Database },
]

function getPageContext() {
  return {
    page_path: window.location.pathname + window.location.search + window.location.hash,
    page_title: document.title || null,
  }
}

export function FeedbackForm({ variant = 'quick', onSubmitted }: FeedbackFormProps) {
  const { isSubmitting, submitError, submitSuccess, submit, reset } = useSubmitFeedback()
  const [type, setType] = useState<FeedbackType>('general')
  const [hasEdits, setHasEdits] = useState(false)
  usePwaUpdateGuard(hasEdits)
  useEffect(() => { if (submitSuccess) setHasEdits(false) }, [submitSuccess])

  if (submitSuccess) {
    return (
      <div className="feedback-success" role="status" aria-live="polite">
        <CheckCircle size={40} />
        <h5>Feedback sent</h5>
        <p>Thanks — your note will help improve TT Learn.</p>
        <button
          className="button"
          onClick={() => {
            if (variant === 'quick' && onSubmitted) { onSubmitted(); return }
            reset()
            setType('general')
          }}
        >
          {variant === 'full' ? 'Send another message' : 'Done'}
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    await submit({
      name: (data.get('name') as string) || null,
      email: (data.get('email') as string) || null,
      message_type: type,
      message: (data.get('message') as string) || '',
      website: (data.get('website') as string) || null,
      ...getPageContext(),
    })
  }

  const ctx = getPageContext()

  return (
    <form className={`feedback-form feedback-form--${variant}`} onSubmit={handleSubmit} onInput={() => setHasEdits(true)}>
      {/* honeypot: real users never fill this; the feedback service discards filled values */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      <input type="hidden" name="page_path" value={ctx.page_path} />
      <input type="hidden" name="page_title" value={ctx.page_title ?? ''} />

      <div className="feedback-field">
        <label htmlFor={`fb-type-${variant}`}>Type</label>
        <div className="feedback-type-group" role="radiogroup" aria-label="Feedback type">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={`feedback-type-btn ${type === value ? 'active' : ''}`}
              role="radio"
              aria-checked={type === value}
              onClick={() => { setType(value); setHasEdits(true) }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {variant === 'full' && (
        <div className="feedback-field">
          <label htmlFor={`fb-name-${variant}`}>Name (optional)</label>
          <input id={`fb-name-${variant}`} name="name" type="text" placeholder="Your name" className="input" />
        </div>
      )}

      <div className="feedback-field">
        <label htmlFor={`fb-msg-${variant}`}>Message</label>
        <textarea
          id={`fb-msg-${variant}`}
          name="message"
          className="input"
          placeholder={variant === 'quick' ? 'What should we fix or improve?' : 'Describe your feedback...'}
          rows={variant === 'quick' ? 3 : 4}
          required
        />
      </div>

      <div className="feedback-field">
        <label htmlFor={`fb-email-${variant}`}>Email (optional)</label>
        <input id={`fb-email-${variant}`} name="email" type="email" className="input" placeholder="For follow-up if needed" />
      </div>

      {submitError && <p className="feedback-error" role="alert">{submitError}</p>}

      <button type="submit" className="button" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 size={18} className="spin" /> Sending…</> : 'Send feedback'}
      </button>
    </form>
  )
}
