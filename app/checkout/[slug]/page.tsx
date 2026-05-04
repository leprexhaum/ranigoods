'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2, ChevronDown, ChevronUp, Mail, User, Phone, CreditCard, Info } from 'lucide-react'
import clsx from 'clsx'
import type { CheckoutProduct, ShippingOption } from '@/lib/types/checkout'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

// ─── Stripe SVG Logo ──────────────────────────────────────────────────────────

function StripeLogo() {
  return (
    <svg viewBox="0 0 60 25" className="h-[15px] inline-block" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.7 10.7 0 01-4.56.95c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.63zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 013.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.03 6.26c.4.44.98.78 1.94.78 1.52 0 2.54-1.65 2.54-3.9 0-2.18-1.04-3.95-2.54-3.95zM28.24 5.57h4.13V20h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.87zm-4.32 9.35v9.78H19.8V5.57h3.7l.12 1.22c.86-1.75 2.6-1.5 3.1-1.32v3.8c-.49-.16-2.29-.43-2.8.95zm-9.55 4.62c0 2.18 2.3 1.5 2.76 1.32V20c-.52.26-1.5.3-2.4.3-2.47 0-4.36-1.62-4.36-4.08V8.88H8.2V5.57h2.17V2.44l4.12-.88v4.01h2.76v3.31h-2.76v5.96zM4.2 12.13c0 .73.57 1 1.48 1.37 1.57.62 3.89 1.54 3.9 4.44C9.58 20.8 7.27 22 4.14 22c-1.42 0-2.96-.3-4.14-.86v-3.76c1.13.6 2.7 1.06 4.14 1.06.94 0 1.62-.19 1.62-.9 0-.76-.7-1.07-1.7-1.5C2.4 15.4 0 14.48 0 11.53 0 8.3 2.46 7.3 5.02 7.3c1.29 0 2.6.24 3.7.7v3.7c-.9-.47-2.28-.87-3.7-.87-.8 0-1.52.17-1.52.8-.01.5.3.77.7.5z" fill="#6772E5"/>
    </svg>
  )
}

// ─── Grouped Fieldset Input ───────────────────────────────────────────────────

type FieldPosition = 'top' | 'middle' | 'bottom' | 'only'

function GroupedInput({
  position,
  icon,
  rightSlot,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  position: FieldPosition
  icon?: React.ReactNode
  rightSlot?: React.ReactNode
}) {
  const radiusClass = {
    top:    'rounded-t-[6px] rounded-b-none',
    middle: 'rounded-none',
    bottom: 'rounded-b-[6px] rounded-t-none',
    only:   'rounded-[6px]',
  }[position]

  const borderClass = position === 'top' || position === 'only'
    ? 'border border-[#E0E0E0]'
    : 'border-l border-r border-b border-[#E0E0E0]'

  return (
    <div className={clsx('relative flex items-center bg-white h-12', radiusClass, borderClass, 'focus-within:border-[#1A56DB] focus-within:shadow-[0_0_0_3px_rgba(26,86,219,0.15)] focus-within:z-10 transition-all')}>
      {icon && (
        <span className="pl-3 pr-2 text-[#9E9E9E] flex-shrink-0">{icon}</span>
      )}
      <input
        {...props}
        className="flex-1 h-full bg-transparent text-[14px] text-[#1A1A1A] placeholder-[#9E9E9E] focus:outline-none px-3"
        style={{ paddingLeft: icon ? 0 : undefined }}
      />
      {rightSlot && (
        <span className="pr-3 flex-shrink-0 flex items-center gap-1">{rightSlot}</span>
      )}
    </div>
  )
}

// ─── Stripe Payment Form ──────────────────────────────────────────────────────

function PaymentForm({ paymentId, successUrl, amount, currency, brandName }: {
  paymentId: string; successUrl: string; amount: number; currency: string; brandName: string
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError('')
    const returnUrl = successUrl || `${window.location.origin}/checkout/success?payment_id=${paymentId}`
    const { error: err } = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl } })
    if (err) { setError(err.message ?? 'Erro ao processar pagamento'); setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-[6px] p-3 text-red-600 text-sm">
          <span className="mt-0.5">⚠</span> {error}
        </div>
      )}

      {/* Submit button with shimmer */}
      <div className="relative overflow-hidden rounded-[6px]">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="relative w-full h-[52px] flex items-center justify-center gap-2 bg-[#1A56DB] hover:bg-[#1648c0] text-white text-[15px] font-medium rounded-[6px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
        >
          {!loading && (
            <span className="absolute inset-0 pointer-events-none shimmer-overlay" />
          )}
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> A processar…</>
            : <>Pagar {fmt(amount, currency)}</>
          }
        </button>
      </div>

      {/* Legal */}
      <p className="text-[13px] text-[#6B7280] leading-relaxed">
        Ao confirmar a inscrição, o senhor concede permissão à <strong className="font-medium">{brandName}</strong> para efetuar cobranças conforme as condições estipuladas, até que ocorra o cancelamento.
      </p>

      {/* Footer */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <span className="text-[12px] text-[#9CA3AF] flex items-center gap-1">
          Powered by <StripeLogo />
        </span>
        <span className="text-[#E5E7EB]">·</span>
        <a href="#" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280]">Termos</a>
        <a href="#" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280]">Privacidade</a>
      </div>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>()

  const [product,        setProduct]        = useState<CheckoutProduct | null>(null)
  const [pageLoading,    setPageLoading]    = useState(true)
  const [pageError,      setPageError]      = useState('')
  const [step,           setStep]           = useState<'form' | 'payment'>('form')

  // Form
  const [name,           setName]           = useState('')
  const [email,          setEmail]          = useState('')
  const [phone,          setPhone]          = useState('')
  const [selectedBumps,  setSelectedBumps]  = useState<string[]>([])
  const [selectedShip,   setSelectedShip]   = useState('')
  const [formError,      setFormError]      = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [promoCode,      setPromoCode]      = useState('')
  const [descExpanded,   setDescExpanded]   = useState(false)
  const [summaryOpen,    setSummaryOpen]    = useState(false)
  const [saveInfo,       setSaveInfo]       = useState(false)
  const [payMethod,      setPayMethod]      = useState<'card' | 'googlepay'>('card')

  // Payment
  const [clientSecret,   setClientSecret]   = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [paymentId,      setPaymentId]      = useState('')
  const [paymentAmount,  setPaymentAmount]  = useState(0)

  useEffect(() => {
    fetch(`/api/checkout/${slug}`)
      .then(r => r.json())
      .then((d: CheckoutProduct) => {
        setProduct(d)
        if (d.shippingOptions?.length > 0) setSelectedShip(d.shippingOptions[0].id)
      })
      .catch(() => setPageError('Produto não encontrado'))
      .finally(() => setPageLoading(false))
  }, [slug])

  const total = product
    ? product.price
      + selectedBumps.reduce((s, id) => s + (product.orderBumps.find(b => b.id === id)?.price ?? 0), 0)
      + (product.shippingOptions.find(s => s.id === selectedShip)?.price ?? 0)
    : 0

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    setFormError('')
    if (!name.trim()) { setFormError('Nome é obrigatório'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFormError('Email inválido'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/checkout/${slug}/payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: name, customerEmail: email, customerPhone: phone, bumpIds: selectedBumps, shippingId: selectedShip || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Erro ao iniciar pagamento'); return }
      setClientSecret(data.clientSecret)
      setPublishableKey(data.publishableKey)
      setPaymentId(data.paymentId)
      setPaymentAmount(data.amount)
      setStep('payment')
    } catch {
      setFormError('Erro de ligação. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const intervalLabel = product?.interval && product.interval !== 'unit'
    ? product.interval === 'month' ? 'por mês'
    : product.interval === 'year' ? 'por ano'
    : product.interval === 'week' ? 'por semana'
    : `por ${product.interval}`
    : null

  // ── Loading ──
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1A56DB]" />
      </div>
    )
  }

  // ── Error ──
  if (pageError || !product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-[#1A1A1A] font-medium text-lg">Produto não encontrado</p>
          <p className="text-[#6B7280] text-sm">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  const stripePromise = publishableKey ? loadStripe(publishableKey) : null
  const brandName = product.brandName || product.name

  // ── Order Summary (left column) ──
  const OrderSummary = () => (
    <div className="space-y-5">
      {/* Product name + price */}
      <div>
        <p className="text-[16px] font-medium text-[#424242]">{product.name}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[28px] lg:text-[32px] font-bold text-[#1A1A1A]">{fmt(product.price, product.currency)}</span>
          {intervalLabel && (
            <span className="text-[14px] text-[#757575]">{intervalLabel}</span>
          )}
        </div>
      </div>

      {/* Description with expand */}
      {product.description && (
        <div>
          <p className={clsx('text-[13px] text-[#757575] leading-relaxed', !descExpanded && 'line-clamp-2')}>
            {product.description}
          </p>
          <button
            type="button"
            onClick={() => setDescExpanded(v => !v)}
            className="mt-1 flex items-center gap-1 text-[13px] text-[#6B7280] hover:text-[#1A1A1A]"
          >
            {descExpanded ? <><ChevronUp size={13} /> Menos</> : <><ChevronDown size={13} /> Mais</>}
          </button>
        </div>
      )}

      {/* Promo code toggle */}
      <button
        type="button"
        className="text-[13px] text-[#374151] border border-[#D1D5DB] bg-[#F5F5F5] rounded-[6px] px-3 py-1.5 hover:bg-[#EBEBEB] transition-colors"
      >
        Adicionar código
      </button>

      {/* Divider */}
      <div className="border-t border-[#E5E7EB]" />

      {/* Line items */}
      <div className="space-y-2">
        <div className="flex justify-between text-[14px]">
          <span className="text-[#6B7280]">{product.name}</span>
          <span className="text-[#1A1A1A]">{fmt(product.price, product.currency)}</span>
        </div>
        {selectedBumps.map(id => {
          const b = product.orderBumps.find(b => b.id === id)
          if (!b) return null
          return (
            <div key={id} className="flex justify-between text-[14px]">
              <span className="text-[#6B7280]">{b.name}</span>
              <span className="text-[#1A1A1A]">+{fmt(b.price, product.currency)}</span>
            </div>
          )
        })}
        {selectedShip && (() => {
          const s = product.shippingOptions.find(s => s.id === selectedShip)
          if (!s || s.price === 0) return null
          return (
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6B7280]">{s.label}</span>
              <span className="text-[#1A1A1A]">+{fmt(s.price, product.currency)}</span>
            </div>
          )
        })()}
        <div className="flex justify-between text-[14px] font-medium pt-1">
          <span className="text-[#1A1A1A]">Subtotal</span>
          <span className="text-[#1A1A1A]">{fmt(total, product.currency)}</span>
        </div>
      </div>

      {/* Promo code input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={promoCode}
          onChange={e => setPromoCode(e.target.value)}
          placeholder="Código promocional"
          className="flex-1 h-10 px-3 text-[14px] border border-[#E0E0E0] rounded-[6px] bg-white placeholder-[#9E9E9E] focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_rgba(26,86,219,0.15)] transition-all"
        />
        <button
          type="button"
          className="h-10 px-4 text-[13px] font-medium text-[#374151] bg-[#F5F5F5] border border-[#D1D5DB] rounded-[6px] hover:bg-[#EBEBEB] transition-colors"
        >
          Aplicar
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-[#E5E7EB]" />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-[14px] text-[#6B7280]">Total devido hoje</span>
        <span className="text-[16px] font-bold text-[#1A1A1A]">{fmt(total, product.currency)}</span>
      </div>
    </div>
  )

  // ── Right column: contact + payment form ──
  const CheckoutForm = () => (
    <div className="space-y-6">
      {step === 'form' ? (
        <form onSubmit={handleProceed} className="space-y-6">

          {/* Section 1: Contact */}
          <div>
            <p className="text-[13px] text-[#6B7280] mb-2">Dados de contato</p>
            <div>
              <GroupedInput
                position="top"
                icon={<Mail size={15} />}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
              />
              <GroupedInput
                position="middle"
                icon={<User size={15} />}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome completo"
                required
              />
              <GroupedInput
                position="bottom"
                icon={<Phone size={15} />}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+55 (11) 99999-9999"
                required={product.requirePhone}
                rightSlot={
                  <Info size={14} className="text-[#9E9E9E] cursor-pointer hover:text-[#6B7280]" />
                }
              />
            </div>
          </div>

          {/* Section 2: Payment method */}
          <div>
            <h2 className="text-[16px] font-medium text-[#1A1A1A] mb-3">Forma de pagamento</h2>
            <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden">

              {/* Card option */}
              <div
                className={clsx(
                  'cursor-pointer',
                  payMethod === 'card' && 'border-l-2 border-l-[#1A56DB]',
                )}
                onClick={() => setPayMethod('card')}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={clsx(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    payMethod === 'card' ? 'border-[#1A56DB]' : 'border-[#D1D5DB]',
                  )}>
                    {payMethod === 'card' && <div className="w-2 h-2 rounded-full bg-[#1A56DB]" />}
                  </div>
                  <CreditCard size={16} className="text-[#6B7280]" />
                  <span className="text-[14px] text-[#1A1A1A] font-medium flex-1">Cartão</span>
                  <div className="flex gap-1">
                    {/* Visa */}
                    <svg viewBox="0 0 38 24" className="h-5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="38" height="24" rx="4" fill="#1A1F71"/>
                      <path d="M16 7l-2.5 10h-2L14 7h2zm8.5 6.5c0-2-2.8-2.1-2.8-3 0-.3.3-.6.9-.7.6-.1 1.3 0 1.9.3l.3-1.6c-.5-.2-1.2-.4-2-.4-2.1 0-3.6 1.1-3.6 2.7 0 1.2 1.1 1.8 1.9 2.2.8.4 1.1.7 1.1 1.1 0 .6-.7.9-1.3.9-.9 0-1.7-.2-2.2-.5l-.4 1.7c.5.2 1.4.4 2.3.4 2.2 0 3.7-1.1 3.7-2.8l.2-.3zm5.5 3.5h1.8L30 7h-1.7c-.4 0-.7.2-.9.6L24.5 17h2l.4-1.1h2.4l.2 1.1zm-2.1-2.6l1-2.7.6 2.7h-1.6zM19 7l-3.1 10h1.9L21 7h-2z" fill="white"/>
                    </svg>
                    {/* Mastercard */}
                    <svg viewBox="0 0 38 24" className="h-5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="38" height="24" rx="4" fill="#252525"/>
                      <circle cx="15" cy="12" r="6" fill="#EB001B"/>
                      <circle cx="23" cy="12" r="6" fill="#F79E1B"/>
                      <path d="M19 7.8a6 6 0 010 8.4A6 6 0 0119 7.8z" fill="#FF5F00"/>
                    </svg>
                  </div>
                </div>

                {/* Card fields — expanded when selected */}
                {payMethod === 'card' && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[#E5E7EB]">
                    <div className="mt-3">
                      <p className="text-[13px] text-[#6B7280] mb-2">Dados do cartão</p>
                      <div>
                        <GroupedInput
                          position="top"
                          type="text"
                          placeholder="Número do cartão"
                          inputMode="numeric"
                          rightSlot={
                            <div className="flex gap-1">
                              <svg viewBox="0 0 38 24" className="h-4 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="38" height="24" rx="4" fill="#1A1F71"/>
                                <path d="M16 7l-2.5 10h-2L14 7h2zm8.5 6.5c0-2-2.8-2.1-2.8-3 0-.3.3-.6.9-.7.6-.1 1.3 0 1.9.3l.3-1.6c-.5-.2-1.2-.4-2-.4-2.1 0-3.6 1.1-3.6 2.7 0 1.2 1.1 1.8 1.9 2.2.8.4 1.1.7 1.1 1.1 0 .6-.7.9-1.3.9-.9 0-1.7-.2-2.2-.5l-.4 1.7c.5.2 1.4.4 2.3.4 2.2 0 3.7-1.1 3.7-2.8l.2-.3zm5.5 3.5h1.8L30 7h-1.7c-.4 0-.7.2-.9.6L24.5 17h2l.4-1.1h2.4l.2 1.1zm-2.1-2.6l1-2.7.6 2.7h-1.6zM19 7l-3.1 10h1.9L21 7h-2z" fill="white"/>
                              </svg>
                            </div>
                          }
                        />
                        <div className="flex">
                          <div className="flex-1">
                            <GroupedInput position="bottom" type="text" placeholder="MM / AA" />
                          </div>
                          <div className="flex-1 border-l border-[#E0E0E0]">
                            <GroupedInput
                              position="bottom"
                              type="text"
                              placeholder="CVC"
                              rightSlot={<CreditCard size={14} className="text-[#9E9E9E]" />}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-[13px] text-[#6B7280] mb-2">Nome do titular do cartão</p>
                      <GroupedInput position="only" type="text" placeholder="Nome como no cartão" />
                    </div>

                    <div>
                      <p className="text-[13px] text-[#6B7280] mb-2">País ou região</p>
                      <div className="relative">
                        <select className="w-full h-12 px-3 text-[14px] text-[#1A1A1A] border border-[#E0E0E0] rounded-[6px] bg-white appearance-none focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_rgba(26,86,219,0.15)] transition-all">
                          <option value="BR">Brasil</option>
                          <option value="PT">Portugal</option>
                          <option value="US">Estados Unidos</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-[#E5E7EB]" />

              {/* Google Pay option */}
              <div
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 cursor-pointer',
                  payMethod === 'googlepay' && 'border-l-2 border-l-[#1A56DB]',
                )}
                onClick={() => setPayMethod('googlepay')}
              >
                <div className={clsx(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  payMethod === 'googlepay' ? 'border-[#1A56DB]' : 'border-[#D1D5DB]',
                )}>
                  {payMethod === 'googlepay' && <div className="w-2 h-2 rounded-full bg-[#1A56DB]" />}
                </div>
                {/* Google Pay wordmark */}
                <svg viewBox="0 0 41 17" className="h-4 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19.2 8.5v5h-1.6V1h4.2c1 0 1.9.3 2.6 1 .7.6 1 1.4 1 2.3 0 .9-.3 1.7-1 2.3-.7.6-1.6 1-2.6.9h-2.6zm0-6v4.5h2.7c.6 0 1.1-.2 1.5-.6.4-.4.6-.9.6-1.4 0-.6-.2-1-.6-1.4-.4-.4-.9-.6-1.5-.6h-2.7v1.5z" fill="#5F6368"/>
                  <path d="M29.3 5.5c1.1 0 2 .3 2.6.9.6.6.9 1.4.9 2.4v4.7h-1.5v-1.1h-.1c-.6.9-1.4 1.3-2.4 1.3-.9 0-1.6-.3-2.2-.8-.6-.5-.9-1.2-.9-2 0-.8.3-1.5.9-2 .6-.5 1.4-.7 2.4-.7.9 0 1.6.2 2.2.5v-.4c0-.6-.2-1.1-.7-1.5-.4-.4-1-.6-1.6-.6-.9 0-1.6.4-2.1 1.1l-1.4-.9c.8-1.2 2-1.9 3.9-1.9zm-2.3 6.1c0 .4.2.7.5.9.3.2.7.4 1.1.4.6 0 1.2-.2 1.6-.7.5-.4.7-1 .7-1.6-.4-.3-1-.5-1.8-.5-.6 0-1 .1-1.4.4-.4.3-.7.7-.7 1.1z" fill="#5F6368"/>
                  <path d="M40.7 5.7l-5.3 12.2h-1.6l2-4.3-3.5-7.9h1.7l2.5 6.1h.1l2.4-6.1h1.7z" fill="#5F6368"/>
                  <path d="M13.4 7.3c0-.5 0-.9-.1-1.4H6.8v2.6h3.7c-.2.8-.6 1.5-1.3 2v1.7h2.1c1.2-1.1 1.9-2.8 1.9-4.9h.2z" fill="#4285F4"/>
                  <path d="M6.8 14c1.8 0 3.4-.6 4.5-1.7l-2.1-1.7c-.6.4-1.4.7-2.4.7-1.8 0-3.4-1.2-3.9-2.9H.7v1.7C1.8 12.5 4.1 14 6.8 14z" fill="#34A853"/>
                  <path d="M2.9 8.4c-.1-.4-.2-.8-.2-1.2 0-.4.1-.8.2-1.2V4.3H.7C.3 5.1 0 6 0 7.2c0 1.2.3 2.1.7 2.9l2.2-1.7z" fill="#FBBC05"/>
                  <path d="M6.8 2.7c1 0 1.9.4 2.6 1l1.9-1.9C10.2.7 8.6 0 6.8 0 4.1 0 1.8 1.5.7 3.7l2.2 1.7c.5-1.7 2.1-2.7 3.9-2.7z" fill="#EA4335"/>
                </svg>
                <span className="text-[14px] text-[#1A1A1A] font-medium">Google Pay</span>
              </div>
            </div>
          </div>

          {/* Section 3: Save info */}
          <div className="bg-[#F9FAFB] rounded-[8px] p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={saveInfo}
                onChange={e => setSaveInfo(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#D1D5DB] text-[#1A56DB] focus:ring-[#1A56DB] cursor-pointer"
              />
              <div>
                <p className="text-[14px] text-[#1A1A1A] font-medium leading-snug">
                  Salve minhas informações para um checkout mais rápido
                </p>
                <p className="text-[13px] text-[#6B7280] mt-0.5 leading-relaxed">
                  Pague com segurança em <strong className="font-medium">{brandName}</strong> e em qualquer lugar onde a Link é aceita.
                </p>
              </div>
            </label>
          </div>

          {/* Shipping options */}
          {product.shippingOptions.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[16px] font-medium text-[#1A1A1A]">Método de envio</h2>
              <div className="border border-[#E5E7EB] rounded-[6px] overflow-hidden divide-y divide-[#E5E7EB]">
                {product.shippingOptions.map((opt: ShippingOption) => (
                  <label key={opt.id} className={clsx(
                    'flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors',
                    selectedShip === opt.id ? 'border-l-2 border-l-[#1A56DB]' : 'hover:bg-[#F9FAFB]',
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        selectedShip === opt.id ? 'border-[#1A56DB]' : 'border-[#D1D5DB]',
                      )}>
                        {selectedShip === opt.id && <div className="w-2 h-2 rounded-full bg-[#1A56DB]" />}
                      </div>
                      <span className="text-[14px] text-[#1A1A1A]">{opt.label}</span>
                    </div>
                    <span className="text-[14px] text-[#1A1A1A] font-medium">
                      {opt.price === 0 ? 'Grátis' : fmt(opt.price, product.currency)}
                    </span>
                    <input type="radio" name="shipping" value={opt.id} checked={selectedShip === opt.id}
                      onChange={() => setSelectedShip(opt.id)} className="sr-only" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-[6px] p-3 text-red-600 text-sm">
              <span>⚠</span> {formError}
            </div>
          )}

          {/* Submit */}
          <div className="relative overflow-hidden rounded-[6px]">
            <button
              type="submit"
              disabled={submitting}
              className="relative w-full h-[52px] flex items-center justify-center gap-2 bg-[#1A56DB] hover:bg-[#1648c0] text-white text-[15px] font-medium rounded-[6px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
            >
              {!submitting && <span className="absolute inset-0 pointer-events-none shimmer-overlay" />}
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /> A preparar…</>
                : <>Assinar</>
              }
            </button>
          </div>

          {/* Legal */}
          <p className="text-[13px] text-[#6B7280] leading-relaxed">
            Ao confirmar a inscrição, o senhor concede permissão à <strong className="font-medium">{brandName}</strong> para efetuar cobranças conforme as condições estipuladas, até que ocorra o cancelamento.
          </p>

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <span className="text-[12px] text-[#9CA3AF] flex items-center gap-1">
              Powered by <StripeLogo />
            </span>
            <span className="text-[#E5E7EB]">·</span>
            <a href="#" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280]">Termos</a>
            <a href="#" className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280]">Privacidade</a>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-medium text-[#1A1A1A]">Pagamento</h2>
            <button onClick={() => setStep('form')} className="text-[#1A56DB] text-sm hover:underline">
              ← Voltar
            </button>
          </div>
          {clientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary:    '#1A56DB',
                    colorBackground: '#ffffff',
                    colorText:       '#1A1A1A',
                    colorDanger:     '#ef4444',
                    fontFamily:      'Inter, system-ui, sans-serif',
                    borderRadius:    '6px',
                    spacingUnit:     '4px',
                  },
                  rules: {
                    '.Input': { border: '1px solid #E0E0E0', boxShadow: 'none', padding: '12px' },
                    '.Input:focus': { border: '1px solid #1A56DB', boxShadow: '0 0 0 3px rgba(26,86,219,0.15)' },
                    '.Label': { fontSize: '13px', fontWeight: '400', color: '#6B7280' },
                    '.Tab': { border: '1px solid #E5E7EB', boxShadow: 'none' },
                    '.Tab--selected': { border: '1px solid #1A56DB', boxShadow: '0 0 0 1px #1A56DB' },
                  },
                },
              }}
            >
              <PaymentForm
                paymentId={paymentId}
                successUrl={product.successUrl}
                amount={paymentAmount}
                currency={product.currency}
                brandName={brandName}
              />
            </Elements>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .shimmer-overlay::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          animation: shimmer 2.5s infinite;
        }
      `}</style>

      <div className="min-h-screen bg-white font-sans">

        {/* Sticky header */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#E5E7EB] h-14 flex items-center px-4 lg:px-0">
          <div className="w-full lg:flex lg:items-center">
            {/* Left: brand */}
            <div className="lg:w-[47%] lg:flex lg:justify-end">
              <div className="lg:w-full lg:max-w-[calc(50vw-24px)] lg:px-12 flex items-center gap-2">
                {product.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.logoUrl} alt={brandName} className="h-4 w-4 object-contain rounded" />
                ) : (
                  <div className="w-4 h-4 bg-[#1A56DB] rounded flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">{brandName.charAt(0)}</span>
                  </div>
                )}
                <span className="text-[14px] font-medium text-[#1A1A1A]">{brandName}</span>
              </div>
            </div>

            {/* Right: toggle on mobile/tablet */}
            <div className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => setSummaryOpen(v => !v)}
                className="flex items-center gap-1 text-[13px] text-[#374151] hover:text-[#1A1A1A]"
              >
                Detalhes {summaryOpen ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile/tablet collapsible summary */}
        {summaryOpen && (
          <div className="lg:hidden border-b border-[#E5E7EB] bg-white">
            <div className="max-w-[576px] mx-auto px-4 md:px-24 py-6">
              <OrderSummary />
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="lg:flex lg:min-h-[calc(100vh-56px)]">

          {/* Left column — order summary, desktop only */}
          <div className="hidden lg:flex lg:w-[47%] justify-end border-r border-[#E5E7EB]">
            <div className="w-full max-w-[calc(50vw-24px)] px-12 py-12">
              <OrderSummary />
            </div>
          </div>

          {/* Right column — form */}
          <div className="lg:flex-1 lg:flex lg:justify-start">
            <div className="w-full lg:max-w-[calc(50vw-24px)] px-4 md:px-24 lg:px-12 py-8 lg:py-12">
              <CheckoutForm />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
