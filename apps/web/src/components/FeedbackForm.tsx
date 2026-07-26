import { type ChangeEvent, type FormEvent, useState } from 'react'
import { Bug, Lightbulb, MessageSquare, Database, CheckCircle, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import {
  MAX_FEEDBACK_SCREENSHOTS,
  useSubmitFeedback,
  validateFeedbackScreenshots,
  type FeedbackType,
} from '../lib/api/feedback'
import { loadFeedbackContactEmail, saveFeedbackContactEmail } from '../lib/feedbackContact'
import './FeedbackForm.css'

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

function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

export function FeedbackForm({ variant = 'quick', onSubmitted }: FeedbackFormProps) {
  const { isSubmitting, submitError, submitSuccess, submit, reset } = useSubmitFeedback()
  const [type, setType] = useState<FeedbackType>('general')
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [email, setEmail] = useState(loadFeedbackContactEmail)
  const hasRememberedEmail = Boolean(loadFeedbackContactEmail())

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
            setScreenshots([])
            setAttachmentError(null)
          }}
        >
          {variant === 'full' ? 'Send another message' : 'Done'}
        </button>
      </div>
    )
  }

  const addScreenshots = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (!selected.length) return
    const next = [...screenshots, ...selected]
    const error = validateFeedbackScreenshots(next)
    if (error) {
      setAttachmentError(error)
      return
    }
    setScreenshots(next)
    setAttachmentError(null)
  }

  const removeScreenshot = (index: number) => {
    setScreenshots((current) => current.filter((_, currentIndex) => currentIndex !== index))
    setAttachmentError(null)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const screenshotError = validateFeedbackScreenshots(screenshots)
    if (screenshotError) {
      setAttachmentError(screenshotError)
      return
    }
    const form = e.currentTarget
    const data = new FormData(form)
    const submitted = await submit({
      name: (data.get('name') as string) || null,
      email: email || null,
      message_type: type,
      message: (data.get('message') as string) || '',
      website: (data.get('website') as string) || null,
      screenshots,
      ...getPageContext(),
    })
    if (submitted) saveFeedbackContactEmail(email)
  }

  const ctx = getPageContext()

  return (
    <form className={`feedback-form feedback-form--${variant}`} onSubmit={handleSubmit}>
      {/* honeypot: real users never fill this; the feedback service discards filled values */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      <input type="hidden" name="page_path" value={ctx.page_path} />
      <input type="hidden" name="page_title" value={ctx.page_title ?? ''} />

      <div className="feedback-field">
        <label>Type</label>
        <div className="feedback-type-group" role="radiogroup" aria-label="Feedback type">
          {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={`feedback-type-btn ${type === value ? 'active' : ''}`}
              role="radio"
              aria-checked={type === value}
              onClick={() => setType(value)}
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
        <div className="picture-heading">
          <div>
            <label htmlFor={`fb-screenshots-${variant}`}>Screenshots (optional)</label>
            <p className="muted">PNG, JPEG, or WebP. Up to {MAX_FEEDBACK_SCREENSHOTS} images, 5 MB each.</p>
          </div>
          <label className="button secondary" htmlFor={`fb-screenshots-${variant}`}>
            <ImagePlus size={17} /> Add screenshot
          </label>
        </div>
        <input
          id={`fb-screenshots-${variant}`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          disabled={isSubmitting || screenshots.length >= MAX_FEEDBACK_SCREENSHOTS}
          onChange={addScreenshots}
        />
        {screenshots.length > 0 && (
          <div className="stack" aria-label="Selected screenshots">
            {screenshots.map((file, index) => (
              <div className="resource-link" key={`${file.name}-${file.lastModified}-${index}`}>
                <span>{file.name}<small>{fileSize(file.size)}</small></span>
                <button type="button" className="toolbar-icon" onClick={() => removeScreenshot(index)} aria-label={`Remove ${file.name}`} disabled={isSubmitting}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="feedback-field">
        <label htmlFor={`fb-email-${variant}`}>Email (optional)</label>
        <input
          id={`fb-email-${variant}`}
          name="email"
          type="email"
          className="input"
          placeholder="For follow-up if needed"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
        {hasRememberedEmail && (
          <div className="feedback-contact-memory">
            <p className="muted">Saved on this device for future feedback.</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setEmail('')
                saveFeedbackContactEmail('')
              }}
            >
              Forget saved email
            </button>
          </div>
        )}
      </div>

      {(attachmentError || submitError) && <p className="feedback-error" role="alert">{attachmentError || submitError}</p>}

      <button type="submit" className="button" disabled={isSubmitting}>
        {isSubmitting ? <><Loader2 size={18} className="spin" /> Sending…</> : 'Send feedback'}
      </button>
    </form>
  )
}
