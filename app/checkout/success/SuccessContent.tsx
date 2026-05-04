'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { CheckoutPaymentDetail } from '@/lib/types/checkout'

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export default function SuccessContent() {
  const searchParams = useSearchParams()
  const paymentId    = searchParams.get('payment_id')

  const [payment, setPayment] = useState<CheckoutPaymentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!paymentId) { setError('ID de pagamento não encontrado'); setLoading(false); return }

    let attempts = 0
    const poll = async () => {
      try {
        const res  = await fetch(`/api/checkout/payment/${paymentId}`)
        const data = await res.json() as CheckoutPaymentDetail
        if (!res.ok) { setError('Pagamento não encontrado'); setLoading(false); return }

        setPayment(data)

        if (data.status === 'pending' && attempts < 10) {
          attempts++
          setTimeout(poll, 3000)
        } else {
          setLoading(false)
          if (data.status === 'paid' && data.successUrl) {
            window.location.href = data.successUrl
          }
        }
      } catch {
        setError('Erro ao verificar pagamento')
        setLoading(false)
      }
    }

    poll()
  }, [paymentId])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-ep-accent" />
        <p className="text-ep-secondary text-sm">A verificar pagamento…</p>
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <XCircle size={48} className="text-ep-danger" />
        <h1 className="text-ep-primary text-xl font-bold">Erro</h1>
        <p className="text-ep-secondary text-sm text-center">{error || 'Pagamento não encontrado'}</p>
      </div>
    )
  }

  if (payment.status === 'failed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <XCircle size={48} className="text-ep-danger" />
        <h1 className="text-ep-primary text-xl font-bold">Pagamento recusado</h1>
        <p className="text-ep-secondary text-sm text-center">
          O seu pagamento não foi processado. Por favor tente novamente.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="w-16 h-16 rounded-full bg-ep-success/10 border border-ep-success/20 flex items-center justify-center">
        <CheckCircle2 size={32} className="text-ep-success" />
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-ep-primary text-2xl font-bold">Pagamento confirmado!</h1>
        <p className="text-ep-secondary text-sm">Obrigado, {payment.customerName}.</p>
      </div>

      <div className="bg-ep-surface border border-ep-border-default rounded-xl p-6 w-full max-w-sm space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-ep-secondary">Produto</span>
          <span className="text-ep-primary font-medium">{payment.productName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ep-secondary">Valor pago</span>
          <span className="text-ep-accent font-bold">{formatCurrency(payment.amount, payment.currency)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ep-secondary">Referência</span>
          <span className="text-ep-muted font-mono text-xs">{payment.id.slice(0, 16)}…</span>
        </div>
      </div>

      <p className="text-ep-muted text-xs text-center">
        Receberá um email de confirmação em breve.
      </p>
    </div>
  )
}
