import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { AppButton, BottomSheet } from '@wudong/tt-players-design-system'

export function Dialog({
  title,
  eyebrow,
  onClose,
  children,
  footer,
  variant = 'dialog',
}: {
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  variant?: 'dialog' | 'sheet'
  closeLabel?: string
}) {
  return <BottomSheet
    isOpen
    onClose={onClose}
    title={title}
    eyebrow={eyebrow}
    footer={footer}
    presentation="sheet"
    height={variant === 'sheet' ? '82%' : 'auto'}
    className={variant === 'dialog' ? 'ttll-dialog-sheet' : undefined}
  >
    {children}
  </BottomSheet>
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
      <AppButton tone="outline" disabled={pending} onClick={onClose}>Cancel</AppButton>
      <AppButton tone={tone === 'danger' ? 'danger' : 'primary'} loading={pending} disabled={pending} onClick={() => void onConfirm()}>{pending ? 'Working…' : confirmLabel}</AppButton>
    </>}
  >
    <div className={`confirm-message ${tone}`}>
      <span className="confirm-icon"><AlertTriangle size={22} aria-hidden="true" /></span>
      <p>{message}</p>
    </div>
  </Dialog>
}
