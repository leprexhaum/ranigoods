'use client'

import { useEffect } from 'react'
import { AlertTriangle, AlertCircle, X, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export interface ConfirmDialogProps {
  open:         boolean
  title:        string
  message:      string
  confirmText?: string
  cancelText?:  string
  variant?:     'danger' | 'warning'
  loading?:     boolean
  onConfirm:    () => void
  onCancel:     () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText  = 'Cancelar',
  variant     = 'danger',
  loading     = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Fechar com Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, loading, onCancel])

  if (!open) return null

  const isDanger  = variant === 'danger'
  const iconColor = isDanger ? 'text-ep-danger' : 'text-ep-warning'
  const iconBg    = isDanger ? 'bg-ep-danger/10 border-ep-danger/20' : 'bg-ep-warning/10 border-ep-warning/20'
  const btnColor  = isDanger
    ? 'bg-ep-danger hover:bg-ep-danger/90 text-white'
    : 'bg-ep-warning hover:bg-ep-warning/90 text-ep-base'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget && !loading) onCancel() }}
    >
      <div className="bg-ep-surface border border-ep-border-default rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4">
          <div className="flex items-start gap-3">
            <div className={clsx('w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5', iconBg)}>
              {isDanger
                ? <AlertTriangle size={16} className={iconColor} />
                : <AlertCircle  size={16} className={iconColor} />}
            </div>
            <div>
              <h3 className="text-ep-primary font-semibold text-sm leading-snug">{title}</h3>
              <p className="text-ep-secondary text-xs mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-ep-muted hover:text-ep-primary transition-colors ml-2 flex-shrink-0 disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-ep-border-subtle">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-ep-border-default text-ep-secondary text-sm hover:text-ep-primary hover:border-ep-border-subtle transition-colors disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-60',
              btnColor,
            )}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
