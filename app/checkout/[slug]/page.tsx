'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2, ChevronDown, ChevronUp, Mail, User, Phone, Info } from 'lucide-react'
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
        Ao confirmar a inscrição, o senhor concede permissão à <strong className="font-medium">{brandName}</strong> para efetuar cobranças conforme as condiçções estipuladas, até que ocorra o cancelamento.
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

// ─── Order Summary ────────────────────────────────────────────────────────────

interface OrderSummaryProps {
  product: CheckoutProduct
  total: number
  selectedBumps: string[]
  selectedShip: string
  promoCode: string
  setPromoCode: (v: string) => void
  descExpanded: boolean
  setDescExpanded: React.Dispatch<React.SetStateAction<boolean>>
  intervalLabel: string | null
}

function OrderSummary({
  product,
  total,
  selectedBumps,
  selectedShip,
  promoCode,
  setPromoCode,
  descExpanded,
  setDescExpanded,
  intervalLabel,
}: OrderSummaryProps) {
  return (
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
}

// ─── Checkout Form ────────────────────────────────────────────────────────────

interface CheckoutFormProps {
  product: CheckoutProduct
  brandName: string
  step: 'form' | 'payment'
  setStep: (v: 'form' | 'payment') => void
  email: string
  setEmail: (v: string) => void
  name: string
  setName: (v: string) => void
  phone: string
  setPhone: (v: string) => void
  selectedShip: string
  setSelectedShip: (v: string) => void
  selectedBumps: string[]
  formError: string
  submitting: boolean
  handleProceed: (e: React.FormEvent) => void
  clientSecret: string
  stripePromise: ReturnType<typeof loadStripe> | null
  paymentId: string
  paymentAmount: number
}

function CheckoutForm({
  product,
  brandName,
  step,
  setStep,
  email,
  setEmail,
  name,
  setName,
  phone,
  setPhone,
  selectedShip,
  setSelectedShip,
  formError,
  submitting,
  handleProceed,
  clientSecret,
  stripePromise,
  paymentId,
  paymentAmount,
}: CheckoutFormProps) {
  return (
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
                position={product.requirePhone ? 'bottom' : 'bottom'}
                icon={<Phone size={15} />}
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+351 912 345 678"
                required={product.requirePhone}
                rightSlot={
                  <Info size={14} className="text-[#9E9E9E] cursor-pointer hover:text-[#6B7280]" />
                }
              />
            </div>
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
                : <>Continuar para pagamento</>
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
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>()

  const [product,       setProduct]       = useState<CheckoutProduct | null>(null)
  const [pageLoading,   setPageLoading]   = useState(true)
  const [pageError,     setPageError]     = useState('')
  const [step,          setStep]          = useState<'form' | 'payment'>('form')

  // Form
  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [phone,         setPhone]         = useState('')
  const [selectedBumps, setSelectedBumps] = useState<string[]>([])
  const [selectedShip,  setSelectedShip]  = useState('')
  const [formError,     setFormError]     = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [promoCode,     setPromoCode]     = useState('')
  const [descExpanded,  setDescExpanded]  = useState(false)
  const [summaryOpen,   setSummaryOpen]   = useState(false)

  // Payment
  const [clientSecret,  setClientSecret]  = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [paymentId,     setPaymentId]     = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)

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
        body: JSON.stringify({
          customerName:  name,
          customerEmail: email,
          customerPhone: phone,
          bumpIds:       selectedBumps,
          shippingId:    selectedShip || undefined,
        }),
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
    : product.interval === 'year'  ? 'por ano'
    : product.interval === 'week'  ? 'por semana'
    : `por ${product.interval}`
    : null

  // stripePromise is recreated only when publishableKey changes (from backend response)
  // Falls back to build-time env var before the first payment-intent call
  const stripePromise = useMemo(
    () => loadStripe(publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
    [publishableKey],
  )

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1A56DB]" />
      </div>
    )
  }

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

  const brandName = product.brandName || product.name

  return (
    <>
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

        {/* Mobile collapsible summary */}
        {summaryOpen && (
          <div className="lg:hidden border-b border-[#E5E7EB] bg-white">
            <div className="max-w-[576px] mx-auto px-4 md:px-24 py-6">
              <OrderSummary
                product={product}
                total={total}
                selectedBumps={selectedBumps}
                selectedShip={selectedShip}
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                descExpanded={descExpanded}
                setDescExpanded={setDescExpanded}
                intervalLabel={intervalLabel}
              />
            </div>
          </div>
        )}

        {/* Main layout */}
        <div className="lg:flex lg:min-h-[calc(100vh-56px)]">

          {/* Left column — order summary, desktop only */}
          <div className="hidden lg:flex lg:w-[47%] justify-end border-r border-[#E5E7EB]">
            <div className="w-full max-w-[calc(50vw-24px)] px-12 py-12">
              <OrderSummary
                product={product}
                total={total}
                selectedBumps={selectedBumps}
                selectedShip={selectedShip}
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                descExpanded={descExpanded}
                setDescExpanded={setDescExpanded}
                intervalLabel={intervalLabel}
              />
            </div>
          </div>

          {/* Right column — form */}
          <div className="lg:flex-1 lg:flex lg:justify-start">
            <div className="w-full lg:max-w-[calc(50vw-24px)] px-4 md:px-24 lg:px-12 py-8 lg:py-12">
              <CheckoutForm
                product={product}
                brandName={brandName}
                step={step}
                setStep={setStep}
                email={email}
                setEmail={setEmail}
                name={name}
                setName={setName}
                phone={phone}
                setPhone={setPhone}
                selectedShip={selectedShip}
                setSelectedShip={setSelectedShip}
                selectedBumps={selectedBumps}
                formError={formError}
                submitting={submitting}
                handleProceed={handleProceed}
                clientSecret={clientSecret}
                stripePromise={stripePromise}
                paymentId={paymentId}
                paymentAmount={paymentAmount}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
