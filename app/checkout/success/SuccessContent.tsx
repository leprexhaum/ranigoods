'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react'
import type { CheckoutPaymentDetail } from '@/lib/types/checkout'
import { usePixels } from '@/components/providers/PixelProvider'

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

export default function SuccessContent() {
  const searchParams = useSearchParams()
  const paymentId    = searchParams.get('payment_id')
  const { trackEvent } = usePixels()

  const [payment, setPayment] = useState<CheckoutPaymentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const firedRef = useRef(false)

  useEffect(() => {
    if (!paymentId) { setError('ID de pagamento não encontrado'); setLoading(false); return }

    let attempts = 0
    const poll = async () => {
      try {
        const res  = await fetch(`/api/checkout/payment/${paymentId}`)
        const data = await res.json() as CheckoutPaymentDetail
        if (!res.ok) { setError('Pagamento não encontrado'); setLoading(false); return }
        setPayment(data)

        if (data.status === 'paid' && !firedRef.current) {
          firedRef.current = true
          trackEvent('Purchase', {
            value:        data.amount,
            currency:     data.currency,
            order_id:     data.id,
            content_type: 'product',
            num_items:    1,
          })
        }

        if ((data.status === 'pending' || data.status === 'processing') && attempts < 20) {
          attempts++
          setTimeout(poll, 3000)
        } else {
          setLoading(false)
          if (data.status === 'paid') {
            // Verifica se há upsell disponível antes de redirecionar
            try {
              const upsellRes = await fetch(`/api/checkout/payment/${paymentId}/upsell`)
              if (upsellRes.ok) {
                const upsell = await upsellRes.json()
                if (upsell?.available) {
                  window.location.href = `/checkout/upsell/${paymentId}`
                  return
                }
              }
            } catch {
              // Se falhar a verificação de upsell, segue para successUrl normalmente
            }
            if (data.successUrl) {
              window.location.href = data.successUrl
            }
          }
        }
      } catch {
        setError('Erro ao verificar pagamento')
        setLoading(false)
      }
    }
    poll()
  }, [paymentId, trackEvent])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-20 h-20 rounded-full bg-[#e5e7eb] animate-pulse" />
        <div className="space-y-3 w-full max-w-xs text-center">
          <div className="h-6 w-48 bg-[#e5e7eb] rounded animate-pulse mx-auto" />
          <div className="h-4 w-56 bg-[#e5e7eb] rounded animate-pulse mx-auto" />
        </div>
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#f3f4f6]">
            <div className="h-4 w-32 bg-[#e5e7eb] rounded animate-pulse" />
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="h-4 w-full bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-[#e5e7eb] rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center gap-5 px-4">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <XCircle size={32} className="text-red-500" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-[#111827] text-xl font-bold">Erro</h1>
          <p className="text-[#6b7280] text-sm">{error || 'Pagamento não encontrado'}</p>
        </div>
      </div>
    )
  }

  if (payment.status === 'processing') {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center gap-5 px-4">
        <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Loader2 size={32} className="text-blue-500 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-[#111827] text-xl font-bold">Pagamento em processamento</h1>
          <p className="text-[#6b7280] text-sm">O seu pagamento está a ser processado. Receberá uma confirmação em breve.</p>
        </div>
      </div>
    )
  }

  if (payment.status === 'failed') {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center gap-5 px-4">
        <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <XCircle size={32} className="text-red-500" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-[#111827] text-xl font-bold">Pagamento recusado</h1>
          <p className="text-[#6b7280] text-sm">O seu pagamento não foi processado. Por favor tente novamente.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-[#f0fdf4] border-2 border-[#bbf7d0] flex items-center justify-center">
            <CheckCircle2 size={40} className="text-[#16a34a]" />
          </div>
          <div>
            <h1 className="text-[#111827] text-2xl font-bold">Pagamento confirmado!</h1>
            <p className="text-[#6b7280] text-sm mt-1">Obrigado, {payment.customerName}. O seu pedido foi recebido.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[#f3f4f6]">
            <h2 className="text-[#111827] font-semibold text-sm">Resumo do pedido</h2>
          </div>
          <div className="px-6 py-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Produto</span>
              <span className="text-[#111827] font-medium">{payment.productName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">Valor pago</span>
              <span className="text-[#111827] font-bold text-base">{fmt(payment.amount, payment.currency)}</span>
            </div>
            <div className="border-t border-[#f3f4f6] pt-3 flex justify-between text-xs">
              <span className="text-[#9ca3af]">Referência</span>
              <span className="text-[#9ca3af] font-mono">{payment.id.slice(0, 20)}…</span>
            </div>
          </div>
        </div>

        <div className="bg-[#f5f4ff] rounded-2xl border border-[#e0deff] px-6 py-5">
          <p className="text-[#4338ca] text-sm font-medium mb-1">O que acontece a seguir?</p>
          <p className="text-[#6b7280] text-sm leading-relaxed">
            Receberá um email de confirmação em breve com os detalhes do seu pedido.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-[#9ca3af] text-xs">
          <ShieldCheck size={13} className="text-[#635bff]" />
          <span>Pagamento processado com segurança via Stripe</span>
        </div>
      </div>
    </div>
  )
}
