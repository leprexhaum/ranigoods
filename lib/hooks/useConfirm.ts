'use client'

import { useState, useCallback } from 'react'
import type { ConfirmDialogProps } from '@/components/ui/ConfirmDialog'

interface ConfirmOptions {
  title:        string
  message:      string
  confirmText?: string
  cancelText?:  string
  variant?:     'danger' | 'warning'
  onConfirm:    () => void | Promise<void>
}

export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean; loading: boolean }) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    setState({ ...opts, open: true, loading: false })
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!state) return
    setState(s => s ? { ...s, loading: true } : null)
    try {
      await state.onConfirm()
    } finally {
      setState(null)
    }
  }, [state])

  const handleCancel = useCallback(() => {
    setState(null)
  }, [])

  const confirmProps: ConfirmDialogProps = {
    open:        state?.open    ?? false,
    title:       state?.title   ?? '',
    message:     state?.message ?? '',
    confirmText: state?.confirmText,
    cancelText:  state?.cancelText,
    variant:     state?.variant,
    loading:     state?.loading ?? false,
    onConfirm:   handleConfirm,
    onCancel:    handleCancel,
  }

  return { confirmProps, confirm }
}
