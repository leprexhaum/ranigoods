'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, ShieldCheck, Zap, X } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface UpsellData {
  funnelId:    string
  productId:   string
  title:       string
  description: string
  image:       string
  price:       number
  currency:    string
}

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

export default function UpsellContent() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const router        = useRouter()

  const [upsell,    setUpsell]    = useState<UpsellData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [accepted,  setAccepted]  = useState(false)
  const [error,     setError]     = useState('')
  const [successUrl, setSuccessUrl] = useState('')

  useEffect(() => {
    async function load() {
      try {
        // Buscar upsell disponível
        const res  = await fetch(`/api/checkout/payment/${paymentId}/upsell`)
        const data = await res.json() as { upsell: UpsellData | null }

        if (!data.upsell) {
          // Sem upsell → ir para success
          router.replace(`/checkout/success?payment_id=${paymentId}`)
          return
        }
        setUpsell(data.upsell)

        // Buscar successUrl do pagamento
        const pRes  = await fetch(`/api/checkout/payment/${paymentId}`)
        const pData = await pRes.json()
        setSuccessUrl(pData.successUrl ?? '')
      } catch {
        router.replace(`/checkout/success?payment_id=${paymentId}`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [paymentId, router])

  async function handleAccept() {
    if (accepting || !upsell) return
    setAccepting(true)
    setError('')
    try {
      const res = await fetch(`/api/checkout/payment/${paymentId}/upsell/accept`, { method: 'POST' })

      // 3DS necessário — completar autenticação on-session
      if (res.status === 402) {
        const data = await res.json()
        if (data.requires_action && data.client_secret) {
          const stripe = await stripePromise
          if (!stripe) {
            setError('Erro ao carregar processador de pagamento.')
            setAccepting(false)
            return
          }
          const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(data.client_secret)
          if (confirmErr) {
            setError(confirmErr.message ?? 'Autenticação falhou. Tente novamente.')
            setAccepting(false)
            return
          }
          if (paymentIntent?.status === 'succeeded') {
            setAccepted(true)
            setTimeout(() => {
              if (successUrl) window.location.href = successUrl
              else router.replace(`/checkout/success?payment_id=${paymentId}`)
            }, 2000)
            return
          }
          setError('Autenticação não completada. Tente novamente.')
          setAccepting(false)
          return
        }
      }

      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao processar. Tente novamente.')
        setAccepting(false)
        return
      }
      setAccepted(true)
      setTimeout(() => {
        if (successUrl) window.location.href = successUrl
        else router.replace(`/checkout/success?payment_id=${paymentId}`)
      }, 2000)
    } catch {
      setError('Erro de ligação. Tente novamente.')
      setAccepting(false)
    }
  }

  async function handleDecline() {
    if (declining) return
    setDeclining(true)
    await fetch(`/api/checkout/payment/${paymentId}/upsell/decline`, { method: 'POST' }).catch(() => {})
    if (successUrl) window.location.href = successUrl
    else router.replace(`/checkout/success?payment_id=${paymentId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="flex justify-center">
            <div className="h-7 w-48 bg-[#e5e7eb] rounded-full animate-pulse" />
          </div>
          <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
            <div className="w-full h-48 bg-[#e5e7eb] animate-pulse" />
            <div className="px-6 py-6 space-y-4">
              <div className="h-6 w-3/4 bg-[#e5e7eb] rounded animate-pulse" />
              <div className="h-4 w-full bg-[#e5e7eb] rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-[#e5e7eb] rounded animate-pulse" />
              <div className="h-8 w-1/3 bg-[#e5e7eb] rounded animate-pulse" />
              <div className="h-12 w-full bg-[#d1d5db] rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center gap-5 px-4">
        <div className="w-20 h-20 rounded-full bg-[#f0fdf4] border-2 border-[#bbf7d0] flex items-center justify-center">
          <CheckCircle2 size={40} className="text-[#16a34a]" />
        </div>
        <div className="text-center">
          <h1 className="text-[#111827] text-2xl font-bold">Upsell confirmado!</h1>
          <p className="text-[#6b7280] text-sm mt-1">O seu pedido adicional foi processado com sucesso.</p>
        </div>
        <Loader2 size={16} className="animate-spin text-[#9ca3af]" />
      </div>
    )
  }

  if (!upsell) return null

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#635bff]/10 border border-[#635bff]/20 text-[#635bff] text-xs font-semibold">
            <Zap size={11} />
            Oferta exclusiva — apenas para si
          </span>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
          {/* Imagem */}
          {upsell.image && (
            <div className="w-full h-48 bg-[#f3f4f6] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={upsell.image} alt={upsell.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="px-6 py-6 space-y-4">
            <div>
              <h1 className="text-[#111827] text-xl font-bold leading-snug">{upsell.title}</h1>
              {upsell.description && (
                <p className="text-[#6b7280] text-sm mt-2 leading-relaxed">{upsell.description}</p>
              )}
            </div>

            {/* Preço */}
            <div className="flex items-baseline gap-2">
              <span className="text-[#111827] text-3xl font-bold">{fmt(upsell.price, upsell.currency)}</span>
              <span className="text-[#9ca3af] text-sm">pagamento único</span>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Botão aceitar */}
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#635bff] hover:bg-[#4f46e5] text-white font-semibold text-base transition-colors disabled:opacity-60"
            >
              {accepting
                ? <><Loader2 size={16} className="animate-spin" /> A processar…</>
                : <><CheckCircle2 size={16} /> Sim! Quero adicionar ao meu pedido</>}
            </button>

            {/* Segurança */}
            <div className="flex items-center justify-center gap-1.5 text-[#9ca3af] text-xs">
              <ShieldCheck size={12} className="text-[#635bff]" />
              <span>1 clique — sem introduzir dados de pagamento novamente</span>
            </div>
          </div>
        </div>

        {/* Recusar */}
        <div className="flex justify-center">
          <button
            onClick={handleDecline}
            disabled={declining}
            className="flex items-center gap-1.5 text-[#9ca3af] hover:text-[#6b7280] text-sm transition-colors disabled:opacity-50"
          >
            <X size={13} />
            {declining ? 'A redirecionar…' : 'Não, obrigado. Continuar sem esta oferta.'}
          </button>
        </div>
      </div>
    </div>
  )
}
