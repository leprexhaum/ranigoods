'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { ShoppingCart, Shield, Star, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import type { CheckoutProduct, OrderBump, ShippingOption } from '@/lib/types/checkout'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

// ─── PaymentForm (dentro do Elements context) ─────────────────────────────────

function PaymentForm({
  paymentId,
  successUrl,
  amount,
  currency,
}: {
  paymentId: string
  successUrl: string
  amount: number
  currency: string
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const router   = useRouter()
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    const returnUrl = successUrl
      ? successUrl
      : `${window.location.origin}/checkout/success?payment_id=${paymentId}`

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Erro ao processar pagamento')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div className="bg-ep-danger/10 border border-ep-danger/20 rounded-md p-3 text-ep-danger text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-ep-accent text-ep-base rounded-lg text-sm font-bold hover:bg-ep-accent-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> A processar…</>
        ) : (
          <><Shield size={14} /> Pagar {formatCurrency(amount, currency)} com segurança</>
        )}
      </button>

      <p className="text-center text-ep-muted text-xs flex items-center justify-center gap-1">
        <Shield size={10} /> Pagamento seguro via Stripe
      </p>
    </form>
  )
}

// ─── OrderBumpCard ────────────────────────────────────────────────────────────

function OrderBumpCard({
  bump,
  selected,
  onToggle,
  currency,
}: {
  bump: OrderBump
  selected: boolean
  onToggle: () => void
  currency: string
}) {
  return (
    <div
      onClick={onToggle}
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
        selected
          ? 'border-ep-accent bg-ep-accent/5'
          : 'border-ep-border-default hover:border-ep-accent/40',
      )}
    >
      <div className={clsx(
        'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors',
        selected ? 'bg-ep-accent border-ep-accent' : 'border-ep-border-default',
      )}>
        {selected && <Check size={11} className="text-ep-base" strokeWidth={3} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ep-primary text-sm font-semibold">{bump.name}</p>
        <p className="text-ep-secondary text-xs mt-0.5">{bump.description}</p>
      </div>
      <span className="text-ep-accent text-sm font-bold flex-shrink-0">
        +{formatCurrency(bump.price, currency)}
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { slug }  = useParams<{ slug: string }>()
  const [product,       setProduct]       = useState<CheckoutProduct | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [step,          setStep]          = useState<'form' | 'payment'>('form')

  // Form fields
  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [phone,         setPhone]         = useState('')
  const [selectedBumps, setSelectedBumps] = useState<string[]>([])
  const [selectedShip,  setSelectedShip]  = useState<string>('')
  const [showReviews,   setShowReviews]   = useState(false)

  // Payment
  const [clientSecret,  setClientSecret]  = useState('')
  const [publishableKey,setPublishableKey]= useState('')
  const [paymentId,     setPaymentId]     = useState('')
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [submitting,    setSubmitting]    = useState(false)
  const [formError,     setFormError]     = useState('')

  useEffect(() => {
    fetch(`/api/checkout/${slug}`)
      .then(r => r.json())
      .then((d: CheckoutProduct) => {
        setProduct(d)
        if (d.shippingOptions?.length > 0) setSelectedShip(d.shippingOptions[0].id)
      })
      .catch(() => setError('Produto não encontrado'))
      .finally(() => setLoading(false))
  }, [slug])

  const total = product
    ? product.price
      + selectedBumps.reduce((s, id) => {
          const b = product.orderBumps.find(b => b.id === id)
          return s + (b?.price ?? 0)
        }, 0)
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
        method:  'POST',
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-ep-accent" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-ep-primary font-semibold">Produto não encontrado</p>
          <p className="text-ep-muted text-sm">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  const stripePromise = publishableKey ? loadStripe(publishableKey) : null

  return (
    <div className="min-h-screen bg-ep-base py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-ep-accent/10 border border-ep-accent/20 flex items-center justify-center mx-auto mb-3">
            <ShoppingCart size={18} className="text-ep-accent" />
          </div>
          <h1 className="text-ep-primary text-xl font-bold">{product.name}</h1>
          <p className="text-ep-accent text-2xl font-bold">
            {formatCurrency(product.price, product.currency)}
            {product.interval !== 'unit' && (
              <span className="text-ep-muted text-sm font-normal">/{product.interval}</span>
            )}
          </p>
        </div>

        {/* Step: Formulário */}
        {step === 'form' && (
          <form onSubmit={handleProceed} className="space-y-4">
            <div className="bg-ep-surface border border-ep-border-default rounded-xl p-5 space-y-4">
              <h2 className="text-ep-primary font-semibold text-sm">Os seus dados</h2>

              <div>
                <label className="text-ep-secondary text-xs font-medium block mb-1.5">Nome completo *</label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="João Silva"
                  className="w-full px-3 py-2.5 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-ep-secondary text-xs font-medium block mb-1.5">Email *</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="joao@exemplo.pt"
                  className="w-full px-3 py-2.5 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-ep-secondary text-xs font-medium block mb-1.5">Telefone</label>
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="+351 912 345 678"
                  className="w-full px-3 py-2.5 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
                />
              </div>
            </div>

            {/* Order Bumps */}
            {product.orderBumps.length > 0 && (
              <div className="bg-ep-surface border border-ep-border-default rounded-xl p-5 space-y-3">
                <h2 className="text-ep-primary font-semibold text-sm">Adicionar ao pedido</h2>
                {product.orderBumps.map(bump => (
                  <OrderBumpCard
                    key={bump.id}
                    bump={bump}
                    currency={product.currency}
                    selected={selectedBumps.includes(bump.id)}
                    onToggle={() => setSelectedBumps(prev =>
                      prev.includes(bump.id)
                        ? prev.filter(id => id !== bump.id)
                        : [...prev, bump.id]
                    )}
                  />
                ))}
              </div>
            )}

            {/* Shipping */}
            {product.shippingOptions.length > 0 && (
              <div className="bg-ep-surface border border-ep-border-default rounded-xl p-5 space-y-3">
                <h2 className="text-ep-primary font-semibold text-sm">Envio</h2>
                {product.shippingOptions.map((opt: ShippingOption) => (
                  <label key={opt.id} className="flex items-center justify-between gap-3 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio" name="shipping" value={opt.id}
                        checked={selectedShip === opt.id}
                        onChange={() => setSelectedShip(opt.id)}
                        className="accent-ep-accent"
                      />
                      <span className="text-ep-primary text-sm">{opt.label}</span>
                    </div>
                    <span className="text-ep-secondary text-sm">
                      {opt.price === 0 ? 'Grátis' : formatCurrency(opt.price, product.currency)}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Resumo */}
            <div className="bg-ep-surface border border-ep-border-default rounded-xl p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ep-secondary">Subtotal</span>
                <span className="text-ep-primary">{formatCurrency(product.price, product.currency)}</span>
              </div>
              {selectedBumps.map(id => {
                const b = product.orderBumps.find(b => b.id === id)
                if (!b) return null
                return (
                  <div key={id} className="flex justify-between text-sm">
                    <span className="text-ep-secondary">{b.name}</span>
                    <span className="text-ep-primary">+{formatCurrency(b.price, product.currency)}</span>
                  </div>
                )
              })}
              {selectedShip && (() => {
                const s = product.shippingOptions.find(s => s.id === selectedShip)
                if (!s || s.price === 0) return null
                return (
                  <div className="flex justify-between text-sm">
                    <span className="text-ep-secondary">{s.label}</span>
                    <span className="text-ep-primary">+{formatCurrency(s.price, product.currency)}</span>
                  </div>
                )
              })()}
              <div className="border-t border-ep-border-subtle pt-2 flex justify-between font-bold">
                <span className="text-ep-primary">Total</span>
                <span className="text-ep-accent text-lg">{formatCurrency(total, product.currency)}</span>
              </div>
            </div>

            {formError && (
              <div className="bg-ep-danger/10 border border-ep-danger/20 rounded-lg p-3 text-ep-danger text-sm">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-ep-accent text-ep-base rounded-xl text-sm font-bold hover:bg-ep-accent-dark transition-colors disabled:opacity-60"
            >
              {submitting
                ? <><Loader2 size={16} className="animate-spin" /> A preparar pagamento…</>
                : <><Shield size={14} /> Continuar para pagamento</>
              }
            </button>
          </form>
        )}

        {/* Step: Pagamento Stripe */}
        {step === 'payment' && clientSecret && stripePromise && (
          <div className="bg-ep-surface border border-ep-border-default rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-ep-primary font-semibold text-sm">Pagamento</h2>
              <button
                onClick={() => setStep('form')}
                className="text-ep-muted hover:text-ep-primary text-xs transition-colors"
              >
                ← Voltar
              </button>
            </div>

            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary:    '#6366f1',
                    colorBackground: '#1e1e2e',
                    colorText:       '#e2e8f0',
                    borderRadius:    '8px',
                  },
                },
              }}
            >
              <PaymentForm
                paymentId={paymentId}
                successUrl={product.successUrl}
                amount={paymentAmount}
                currency={product.currency}
              />
            </Elements>
          </div>
        )}

        {/* Reviews */}
        {product.reviews.length > 0 && (
          <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
            <button
              onClick={() => setShowReviews(s => !s)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-ep-raised/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Star size={13} className="text-ep-warning fill-ep-warning" />
                <span className="text-ep-primary text-sm font-semibold">
                  Avaliações ({product.reviews.length})
                </span>
              </div>
              {showReviews ? <ChevronUp size={14} className="text-ep-muted" /> : <ChevronDown size={14} className="text-ep-muted" />}
            </button>
            {showReviews && (
              <div className="px-5 pb-5 space-y-3 border-t border-ep-border-subtle pt-4">
                {product.reviews.map((r, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-ep-primary text-sm font-medium">{r.author}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} size={10} className={j < r.rating ? 'text-ep-warning fill-ep-warning' : 'text-ep-muted'} />
                        ))}
                      </div>
                    </div>
                    <p className="text-ep-secondary text-xs">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
