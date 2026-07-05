import { X } from 'lucide-react'
import { FeedbackForm } from './FeedbackForm'

interface FeedbackSheetProps {
  onClose: () => void
}

export function FeedbackSheet({ onClose }: FeedbackSheetProps) {
  return (
    <div className="feedback-sheet">
      <button className="feedback-sheet-scrim" aria-label="Close feedback" onClick={onClose} />
      <div className="feedback-sheet-panel" role="dialog" aria-modal="true" aria-label="Send feedback">
        <div className="feedback-sheet-head">
          <div>
            <small style={{ color: 'var(--ink-soft)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feedback</small>
            <h3>Send a quick note</h3>
          </div>
          <button className="toolbar-icon" onClick={onClose} aria-label="Close feedback">
            <X size={22} />
          </button>
        </div>
        <FeedbackForm variant="quick" onSubmitted={onClose} />
      </div>
    </div>
  )
}
