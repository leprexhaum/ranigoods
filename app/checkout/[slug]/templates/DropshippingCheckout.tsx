'use client'

import { useState, useEffect, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2, Truck } from 'lucide-react'
import clsx from 'clsx'
import type { CheckoutProduct, ShippingOption } from '@/lib/types/checkout'
import { captureUrlParams, getStoredUrlParams } from '@/lib/url-params'
import { useCheckoutPixels } from '@/lib/hooks/useCheckoutPixels'

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

function PaymentForm({ paymentId, successUrl, amount, currency, brandName }: {
  paymentId: string; successUrl: string; amount: number; currency: string; brandName: string
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
              if (upsell?.available) { window.location.href = `/checkout/upsell/${paymentId}`; return }
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
        Ao confirmar, autoriza a <strong className="font-medium text-[#30313D]">{brandName}</strong> a efetuar cobranças conforme as condições acordadas.
      </p>
    </form>
  )
}

export default function DropshippingCheckout({ product }: { product: CheckoutProduct }) {
  const brandName = product.brandName || product.name
  const { trackEvent } = useCheckoutPixels(product.id)

  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [phone,         setPhone]         = useState('')
  const [addrLine1,     setAddrLine1]     = useState('')
  const [addrLine2,     setAddrLine2]     = useState('')
  const [addrCity,      setAddrCity]      = useState('')
  const [addrPostal,    setAddrPostal]    = useState('')
  const [addrCountry,   setAddrCountry]   = useState('PT')
  const [selectedShip,  setSelectedShip]  = useState('')
  const [formError,     setFormError]     = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [clientSecret,  setClientSecret]  = useState('')
  const [publishableKey,setPublishableKey]= useState('')
  const [paymentId,     setPaymentId]     = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)

  useEffect(() => {
    captureUrlParams()
    const ship = product.shippingOptions?.length > 0 ? product.shippingOptions[0].id : ''
    if (ship) setSelectedShip(ship)
    createPaymentIntent(ship)
    trackEvent('InitiateCheckout', { value: product.price, currency: product.currency, content_ids: [product.id] })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = product.price
    + (product.shippingOptions.find(s => s.id === selectedShip)?.price ?? 0)

  const createPaymentIntent = async (ship: string) => {
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
          shippingId:    ship || undefined,
          urlParams,
          address: addrLine1 ? {
            line1: addrLine1, line2: addrLine2,
            city: addrCity, postalCode: addrPostal, country: addrCountry,
          } : undefined,
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

  const inputCls = 'w-full h-11 px-3 bg-white border border-[#E0E6EB] rounded-[5px] text-[15px] text-[#30313D] placeholder-[#8792A2] focus:outline-none focus:border-[#0570DE] focus:shadow-[0_0_0_3px_rgba(5,112,222,0.16)] transition-all'

  return (
    <div className="min-h-screen bg-[#F6F9FC] font-sans">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          {product.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.logoUrl} alt={brandName} className="w-9 h-9 rounded-full object-contain border border-[#E0E6EB]" />
          ) : null}
          <span className="text-[15px] font-semibold text-[#30313D]">{brandName}</span>
        </div>

        {/* Produto */}
        <div className="bg-white rounded-xl border border-[#E0E6EB] overflow-hidden">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
          )}
          <div className="p-5">
            <h1 className="text-[18px] font-semibold text-[#30313D]">{product.name}</h1>
            {product.description && <p className="text-[14px] text-[#6D6E78] mt-1">{product.description}</p>}
            <p className="text-[28px] font-bold text-[#30313D] mt-3 tabular-nums">{fmt(product.price, product.currency)}</p>
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white rounded-xl border border-[#E0E6EB] p-5 space-y-3">
          <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide">Informações de contacto</p>
          <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoComplete="email"
            onBlur={e => { if (e.target.value.trim()) updatePayment({ customerEmail: e.target.value.trim() }) }}
          />
          <input className={inputCls} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" required autoComplete="name"
            onBlur={e => { if (e.target.value.trim()) updatePayment({ customerName: e.target.value.trim() }) }}
          />
          <input className={inputCls} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefone" required autoComplete="tel"
            onBlur={e => { if (e.target.value.trim()) updatePayment({ customerPhone: e.target.value.trim() }) }}
          />
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-xl border border-[#E0E6EB] p-5 space-y-3">
          <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide">Endereço de entrega</p>
          <input className={inputCls} type="text" value={addrLine1} onChange={e => setAddrLine1(e.target.value)} placeholder="Morada" required autoComplete="address-line1" />
          <input className={inputCls} type="text" value={addrLine2} onChange={e => setAddrLine2(e.target.value)} placeholder="Complemento (opcional)" autoComplete="address-line2" />
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} type="text" value={addrCity} onChange={e => setAddrCity(e.target.value)} placeholder="Cidade" required autoComplete="address-level2" />
            <input className={inputCls} type="text" value={addrPostal} onChange={e => setAddrPostal(e.target.value)} placeholder="Código postal" required autoComplete="postal-code" />
          </div>
          <select className={inputCls} value={addrCountry} onChange={e => setAddrCountry(e.target.value)} autoComplete="country">
            <option value="PT">Portugal</option>
            <option value="BR">Brasil</option>
            <option value="ES">Espanha</option>
            <option value="FR">França</option>
            <option value="DE">Alemanha</option>
            <option value="IT">Itália</option>
            <option value="GB">Reino Unido</option>
            <option value="US">Estados Unidos</option>
          </select>
        </div>

        {/* Envio */}
        {product.shippingOptions.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E0E6EB] p-5 space-y-3">
            <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide">Método de envio</p>
            <div className="grid gap-2">
              {product.shippingOptions.map((opt: ShippingOption) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedShip(opt.id)}
                  className={clsx(
                    'flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left',
                    selectedShip === opt.id
                      ? 'border-[#0570DE] bg-[#F0F7FF]'
                      : 'border-[#E0E6EB] hover:border-[#C0C8D2]',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Truck size={16} className={selectedShip === opt.id ? 'text-[#0570DE]' : 'text-[#8792A2]'} />
                    <span className="text-[14px] font-medium text-[#30313D]">{opt.label}</span>
                  </div>
                  <span className="text-[14px] font-semibold text-[#30313D]">
                    {opt.price === 0 ? 'Grátis' : fmt(opt.price, product.currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-white rounded-xl border border-[#E0E6EB] p-5">
          <div className="flex justify-between items-center">
            <span className="text-[14px] font-medium text-[#30313D]">Total</span>
            <span className="text-[20px] font-bold text-[#30313D] tabular-nums">{fmt(total, product.currency)}</span>
          </div>
        </div>

        {formError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-[5px] p-3 text-red-600 text-sm">
            <span>⚠</span> {formError}
          </div>
        )}

        {/* Pagamento */}
        <div className="bg-white rounded-xl border border-[#E0E6EB] p-5 space-y-4">
          <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide">Forma de pagamento</p>
          {!clientSecret ? (
            <div className="w-full h-12 flex items-center justify-center text-[13px] text-[#8792A2]">
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
                <PaymentForm paymentId={paymentId} successUrl={product.successUrl} amount={paymentAmount} currency={product.currency} brandName={brandName} />
              </Elements>
            )
          )}
        </div>
      </div>
    </div>
  )
}
