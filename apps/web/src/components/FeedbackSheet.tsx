import { Dialog } from './Dialog'
import { FeedbackForm } from './FeedbackForm'

interface FeedbackSheetProps {
  onClose: () => void
}

export function FeedbackSheet({ onClose }: FeedbackSheetProps) {
  return <Dialog title="Send a quick note" eyebrow="Feedback" variant="sheet" onClose={onClose} closeLabel="Close feedback">
    <FeedbackForm variant="quick" onSubmitted={onClose} />
  </Dialog>
}
