import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function Dialog({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  variant = 'dialog',
  closeLabel = 'Close dialog',
}: {
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  variant?: 'dialog' | 'sheet'
  closeLabel?: string
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const focusFirst = () => {
      const first = panel?.querySelector<HTMLElement>('[autofocus], input, select, textarea, button:not([disabled]), a[href]')
      ;(first ?? panel)?.focus()
    }
    const frame = window.requestAnimationFrame(focusFirst)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const controls = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)).filter((control) => control.offsetParent !== null)
      if (!controls.length) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [onClose])

  return createPortal(
    <div className="dialog-layer">
      <button type="button" className="dialog-scrim" aria-label={closeLabel} onClick={onClose} />
      <div
        ref={panelRef}
        className={`dialog-panel ${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="dialog-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="toolbar-icon" onClick={onClose} aria-label={closeLabel}><X size={21} /></button>
        </header>
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  pending = false,
  tone = 'danger',
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
  pending?: boolean
  tone?: 'danger' | 'primary'
}) {
  return <Dialog
    title={title}
    eyebrow={tone === 'danger' ? 'Please confirm' : undefined}
    onClose={onClose}
    footer={<>
      <button type="button" className="button secondary" disabled={pending} onClick={onClose}>Cancel</button>
      <button type="button" className={`button ${tone === 'danger' ? 'danger' : ''}`} disabled={pending} onClick={() => void onConfirm()}>{pending ? 'Working…' : confirmLabel}</button>
    </>}
  >
    <div className={`confirm-message ${tone}`}>
      <span className="confirm-icon"><AlertTriangle size={22} aria-hidden="true" /></span>
      <p>{message}</p>
    </div>
  </Dialog>
}
