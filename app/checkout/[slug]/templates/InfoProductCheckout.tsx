'use client'

import { useState, useEffect, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2 } from 'lucide-react'
import type { CheckoutProduct } from '@/lib/types/checkout'
import { captureUrlParams, getStoredUrlParams } from '@/lib/url-params'
import { useCheckoutPixels } from '@/lib/hooks/useCheckoutPixels'

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

function PaymentForm({ paymentId, successUrl, amount, currency, brandName, legalName }: {
  paymentId: string; successUrl: string; amount: number; currency: string; brandName: string; legalName: string
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)

  const pollAndRedirect = async () => {
    setPolling(true)
    const successDest = successUrl || `${window.location.origin}/checkout/success?payment_id=${paymentId}`
    let attempts = 0
    const poll = async (): Promise<void> => {
      try {
        const res  = await fetch(`/api/checkout/payment/${paymentId}`)
        const data = await res.json()
        if (data.status === 'paid') {
          try {
            const upsellRes = await fetch(`/api/checkout/payment/${paymentId}/upsell`)
            if (upsellRes.ok) {
              const upsell = await upsellRes.json()
              if (upsell?.upsell) { window.location.href = `/checkout/upsell/${paymentId}`; return }
            }
          } catch { /* segue para success */ }
          window.location.href = successDest
          return
        }
        if (data.status === 'failed') { setError('Pagamento recusado. Tente novamente.'); setPolling(false); setLoading(false); return }
        if (attempts < 20) { attempts++; setTimeout(poll, 3000) }
        else { window.location.href = successDest }
      } catch {
        if (attempts < 20) { attempts++; setTimeout(poll, 3000) }
        else { window.location.href = successDest }
      }
    }
    poll()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError('')
    const returnUrl = successUrl || `${window.location.origin}/checkout/success?payment_id=${paymentId}`
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    })
    if (err) { setError(err.message ?? 'Erro ao processar pagamento'); setLoading(false); return }
    if (paymentIntent) { pollAndRedirect(); return }
  }

  if (polling) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        <Loader2 size={36} className="animate-spin text-[#0570DE]" />
        <p className="text-[14px] text-[#6D6E78] text-center">A verificar pagamento…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-[5px] p-3 text-red-600 text-sm">
          <span>⚠</span> {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full h-12 flex items-center justify-center gap-2 bg-[#0570DE] hover:bg-[#0461c4] text-white text-[15px] font-semibold rounded-[5px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> A processar…</> : <>Pagar {fmt(amount, currency)}</>}
      </button>
      <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#8792A2] pt-1">
        <span>Powered by Stripe</span>
      </div>
      <p className="text-[12px] text-[#6D6E78] leading-relaxed text-center">
        Ao confirmar, autoriza a <strong className="font-medium text-[#30313D]">{legalName || brandName}</strong> a efetuar cobranças conforme as condições acordadas.
      </p>
    </form>
  )
}

export default function InfoProductCheckout({ product }: { product: CheckoutProduct }) {
  const brandName = product.brandName || product.name
  const { trackEvent } = useCheckoutPixels(product.id)

  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [phone,         setPhone]         = useState('')
  const [formError,     setFormError]     = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [clientSecret,  setClientSecret]  = useState('')
  const [publishableKey,setPublishableKey]= useState('')
  const [paymentId,     setPaymentId]     = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)

  useEffect(() => {
    captureUrlParams()
    createPaymentIntent()
    trackEvent('InitiateCheckout', { value: product.price, currency: product.currency, content_ids: [product.id] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createPaymentIntent = async () => {
    setSubmitting(true)
    try {
      const urlParams = getStoredUrlParams()
      const res = await fetch(`/api/checkout/${product.slug}/payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName:  name || '',
          customerEmail: email || '',
          customerPhone: phone,
          bumpIds:       [],
          urlParams,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Erro ao iniciar pagamento'); return }
      setClientSecret(data.clientSecret)
      setPublishableKey(data.publishableKey)
      setPaymentId(data.paymentId)
      setPaymentAmount(data.amount)
    } catch {
      setFormError('Erro de ligação. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const stripePromise = useMemo(
    () => loadStripe(publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
    [publishableKey],
  )

  const updatePayment = (fields: { customerName?: string; customerEmail?: string; customerPhone?: string }) => {
    if (!paymentId) return
    fetch(`/api/checkout/payment/${paymentId}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }).catch(() => {})
  }

  const fieldWrapTop    = 'relative flex items-center bg-white border border-[#E0E6EB] rounded-t-[5px] focus-within:border-[#0570DE] focus-within:shadow-[0_0_0_3px_rgba(5,112,222,0.16)] focus-within:z-10 transition-all'
  const fieldWrapMid    = 'relative flex items-center bg-white border-l border-r border-b border-[#E0E6EB] focus-within:border-[#0570DE] focus-within:shadow-[0_0_0_3px_rgba(5,112,222,0.16)] focus-within:z-10 transition-all'
  const fieldWrapBottom = 'relative flex items-center bg-white border-l border-r border-b border-[#E0E6EB] rounded-b-[5px] focus-within:border-[#0570DE] focus-within:shadow-[0_0_0_3px_rgba(5,112,222,0.16)] focus-within:z-10 transition-all'
  const inputBase = 'flex-1 h-12 bg-transparent text-[15px] text-[#30313D] placeholder-[#8792A2] pl-2 pr-3 focus:outline-none'

  return (
    <div className="min-h-screen bg-[#F6F9FC] font-sans flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E0E6EB] shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#F3F4F6]">
          <div className="flex items-center gap-3 mb-4">
            {product.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.logoUrl} alt={brandName} className="w-8 h-8 rounded-full object-contain border border-[#E0E6EB]" />
            ) : null}
            <span className="text-[14px] font-medium text-[#30313D]">{brandName}</span>
          </div>
          <h1 className="text-[22px] font-semibold text-[#30313D]">{product.name}</h1>
          {product.description && (
            <p className="text-[14px] text-[#6D6E78] mt-1 leading-relaxed">{product.description}</p>
          )}
          <div className="mt-4">
            <span className="text-[32px] font-semibold text-[#30313D] tabular-nums">{fmt(product.price, product.currency)}</span>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-6 space-y-6">
          <div>
            <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide mb-2">Informações de contacto</p>
            <div>
              <div className={fieldWrapTop}>
                <span className="pl-3 flex-shrink-0">
                  <svg focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8.75 10.7622C8.75 10.348 9.08579 10.0122 9.5 10.0122H12.5C12.9142 10.0122 13.25 10.348 13.25 10.7622C13.25 11.1764 12.9142 11.5122 12.5 11.5122H9.5C9.08579 11.5122 8.75 11.1764 8.75 10.7622Z" fill="#1A1A1A" fillOpacity="0.5"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M3 1.51221C1.34315 1.51221 0 2.85535 0 4.51221V11.5122C0 13.1691 1.34315 14.5122 3 14.5122H13C14.6569 14.5122 16 13.1691 16 11.5122V4.51221C16 2.85535 14.6569 1.51221 13 1.51221H3ZM13 3.01221H3C2.43944 3.01221 1.9507 3.31969 1.69325 3.7752C1.7485 3.78999 1.80292 3.81137 1.85548 3.83967L7.88138 7.08439C7.95537 7.12423 8.04443 7.12423 8.11843 7.08439L14.1443 3.83967C14.1969 3.81134 14.2514 3.78994 14.3067 3.77515C14.0493 3.31967 13.5605 3.01221 13 3.01221ZM14.5 5.35179L8.82958 8.40509C8.31162 8.68399 7.68819 8.68399 7.17023 8.40509L1.5 5.35189V11.5122C1.5 12.3406 2.17157 13.0122 3 13.0122H13C13.8284 13.0122 14.5 12.3406 14.5 11.5122V5.35179Z" fill="#1A1A1A" fillOpacity="0.5"/>
                  </svg>
                </span>
                <input className={inputBase} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoComplete="email"
                  onBlur={e => { if (e.target.value.trim()) updatePayment({ customerEmail: e.target.value.trim() }) }}
                />
              </div>
              <div className={fieldWrapMid}>
                <span className="pl-3 flex-shrink-0">
                  <svg focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M2.5 14.4H13.5C13.7209 14.4 13.9 14.2209 13.9 14C13.9 12.1222 12.3778 10.6 10.5 10.6H5.5C3.62223 10.6 2.1 12.1222 2.1 14C2.1 14.2209 2.27909 14.4 2.5 14.4ZM2.5 16H13.5C14.6046 16 15.5 15.1046 15.5 14C15.5 11.2386 13.2614 9 10.5 9H5.5C2.73858 9 0.5 11.2386 0.5 14C0.5 15.1046 1.39543 16 2.5 16Z" fill="#1A1A1A" fillOpacity="0.5"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M8 6.4C9.32548 6.4 10.4 5.32548 10.4 4C10.4 2.67452 9.32548 1.6 8 1.6C6.67452 1.6 5.6 2.67452 5.6 4C5.6 5.32548 6.67452 6.4 8 6.4ZM8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="#1A1A1A" fillOpacity="0.5"/>
                  </svg>
                </span>
                <input className={inputBase} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" required autoComplete="name"
                  onBlur={e => { if (e.target.value.trim()) updatePayment({ customerName: e.target.value.trim() }) }}
                />
              </div>
              {product.requirePhone && (
                <div className={fieldWrapBottom}>
                  <input className={inputBase} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+351 912 345 678" autoComplete="tel"
                    onBlur={e => { if (e.target.value.trim()) updatePayment({ customerPhone: e.target.value.trim() }) }}
                  />
                </div>
              )}
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-[5px] p-3 text-red-600 text-sm">
              <span>⚠</span> {formError}
            </div>
          )}

          <div>
            <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide mb-3">Forma de pagamento</p>
            {!clientSecret ? (
              <div className="w-full h-12 flex items-center justify-center rounded-[5px] text-[13px] text-[#8792A2]">
                <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A preparar pagamento…</span>
              </div>
            ) : (
              stripePromise && (
                <Elements stripe={stripePromise} options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: { colorPrimary: '#0570DE', colorBackground: '#ffffff', colorText: '#30313D', colorDanger: '#df1b41', fontFamily: 'Inter, -apple-system, sans-serif', borderRadius: '5px' },
                    rules: {
                      '.Input': { border: '1px solid #E0E6EB', boxShadow: 'none', padding: '12px' },
                      '.Input:focus': { border: '1px solid #0570DE', boxShadow: '0 0 0 3px rgba(5,112,222,0.16)' },
                      '.Label': { fontSize: '12px', fontWeight: '500', color: '#30313D', textTransform: 'uppercase', letterSpacing: '0.05em' },
                    },
                  },
                }}>
                  <PaymentForm paymentId={paymentId} successUrl={product.successUrl} amount={paymentAmount} currency={product.currency} brandName={brandName} legalName={product.legalName || ''} />
                </Elements>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
