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
import { Lock, ShieldCheck, Star, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import type { CheckoutProduct, OrderBump, ShippingOption } from '@/lib/types/checkout'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

// ─── Stripe Payment Form ──────────────────────────────────────────────────────

function PaymentForm({ paymentId, successUrl, amount, currency }: {
  paymentId: string; successUrl: string; amount: number; currency: string
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
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
          <span className="mt-0.5">⚠</span> {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#635bff] hover:bg-[#5851db] text-white rounded-lg text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> A processar…</>
          : <><Lock size={14} /> Pagar {fmt(amount, currency)}</>
        }
      </button>
      <div className="flex items-center justify-center gap-1.5 text-[#6b7280] text-xs">
        <ShieldCheck size={12} className="text-[#635bff]" />
        <span>Pagamento seguro via</span>
        <span className="font-semibold text-[#635bff]">Stripe</span>
      </div>
    </form>
  )
}

// ─── Order Bump ───────────────────────────────────────────────────────────────

function OrderBumpCard({ bump, selected, onToggle, currency }: {
  bump: OrderBump; selected: boolean; onToggle: () => void; currency: string
}) {
  return (
    <div
      onClick={onToggle}
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
        selected ? 'border-[#635bff] bg-[#f5f4ff]' : 'border-[#e5e7eb] hover:border-[#c7c4ff] bg-white',
      )}
    >
      <div className={clsx(
        'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all',
        selected ? 'bg-[#635bff] border-[#635bff]' : 'border-[#d1d5db] bg-white',
      )}>
        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#111827] text-sm font-semibold">{bump.name}</p>
        <p className="text-[#6b7280] text-xs mt-0.5 leading-relaxed">{bump.description}</p>
      </div>
      <span className="text-[#635bff] text-sm font-bold flex-shrink-0">+{fmt(bump.price, currency)}</span>
    </div>
  )
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={12} className={i < rating ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-[#d1d5db]'} />
      ))}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

function Input({ label, required, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
        {label}{required && <span className="text-[#635bff] ml-0.5">*</span>}
      </label>
      <input
        {...props}
        className="w-full px-3.5 py-2.5 bg-white border border-[#d1d5db] rounded-lg text-[#111827] text-sm placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#635bff]/30 focus:border-[#635bff] transition-all"
      />
    </div>
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
  const [showAllReviews, setShowAllReviews] = useState(false)

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

  // ── Loading ──
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#635bff]" />
      </div>
    )
  }

  // ── Error ──
  if (pageError || !product) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-[#111827] font-semibold text-lg">Produto não encontrado</p>
          <p className="text-[#6b7280] text-sm">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  const stripePromise = publishableKey ? loadStripe(publishableKey) : null
  const visibleReviews = showAllReviews ? product.reviews : product.reviews.slice(0, 3)

  // ── Painel esquerdo: resumo do produto ──
  const SummaryPanel = () => (
    <div className="space-y-6">
      {/* Branding */}
      <div className="flex items-center gap-3">
        {product.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.logoUrl} alt={product.brandName || product.name} className="h-8 object-contain" />
        ) : (
          <span className="text-[#111827] font-bold text-lg">{product.brandName || product.name}</span>
        )}
      </div>

      {/* Produto */}
      <div className="flex items-start gap-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-xl object-cover border border-[#e5e7eb] flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-[#f3f4f6] border border-[#e5e7eb] flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🛍️</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[#111827] font-semibold text-base leading-snug">{product.name}</p>
          {product.description && (
            <p className="text-[#6b7280] text-sm mt-1 leading-relaxed">{product.description}</p>
          )}
        </div>
      </div>

      {/* Linha divisória */}
      <div className="border-t border-[#e5e7eb]" />

      {/* Resumo de preços */}
      <div className="space-y-2.5">
        <div className="flex justify-between text-sm">
          <span className="text-[#6b7280]">{product.name}</span>
          <span className="text-[#111827] font-medium">{fmt(product.price, product.currency)}</span>
        </div>
        {selectedBumps.map(id => {
          const b = product.orderBumps.find(b => b.id === id)
          if (!b) return null
          return (
            <div key={id} className="flex justify-between text-sm">
              <span className="text-[#6b7280]">{b.name}</span>
              <span className="text-[#111827] font-medium">+{fmt(b.price, product.currency)}</span>
            </div>
          )
        })}
        {selectedShip && (() => {
          const s = product.shippingOptions.find(s => s.id === selectedShip)
          if (!s || s.price === 0) return null
          return (
            <div className="flex justify-between text-sm">
              <span className="text-[#6b7280]">{s.label}</span>
              <span className="text-[#111827] font-medium">+{fmt(s.price, product.currency)}</span>
            </div>
          )
        })()}
        <div className="border-t border-[#e5e7eb] pt-2.5 flex justify-between">
          <span className="text-[#111827] font-semibold text-base">Total</span>
          <span className="text-[#111827] font-bold text-xl">{fmt(total, product.currency)}</span>
        </div>
        {product.interval !== 'unit' && (
          <p className="text-[#9ca3af] text-xs text-right">por {product.interval}</p>
        )}
      </div>

      {/* Reviews */}
      {product.showReviews && product.reviews.length > 0 && (
        <>
          <div className="border-t border-[#e5e7eb]" />
          <div className="space-y-4">
            <h3 className="text-[#111827] font-semibold text-sm">O que dizem os clientes</h3>
            {visibleReviews.map((r, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <StarRating rating={r.rating} />
                  <span className="text-[#374151] text-xs font-semibold">{r.author}</span>
                </div>
                <p className="text-[#6b7280] text-xs leading-relaxed">{r.comment}</p>
              </div>
            ))}
            {product.reviews.length > 3 && (
              <button
                onClick={() => setShowAllReviews(s => !s)}
                className="flex items-center gap-1 text-[#635bff] text-xs font-medium hover:underline"
              >
                {showAllReviews ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver todas ({product.reviews.length})</>}
              </button>
            )}
          </div>
        </>
      )}

      {/* Segurança */}
      <div className="border-t border-[#e5e7eb] pt-4 flex items-center gap-2 text-[#9ca3af] text-xs">
        <ShieldCheck size={14} className="text-[#635bff] flex-shrink-0" />
        <span>Pagamento seguro com encriptação SSL de 256 bits</span>
      </div>
    </div>
  )

  // ── Painel direito: formulário ──
  const FormPanel = () => (
    <div className="space-y-6">
      {step === 'form' ? (
        <form onSubmit={handleProceed} className="space-y-6">
          {/* Dados do cliente */}
          <div className="space-y-4">
            <h2 className="text-[#111827] font-semibold text-base">Informações de contacto</h2>
            <Input label="Nome completo" required value={name} onChange={e => setName(e.target.value)} placeholder="João Silva" />
            <Input label="Email" required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@exemplo.pt" />
            {product.requirePhone && (
              <Input label="Telefone" required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+351 912 345 678" />
            )}
            {!product.requirePhone && (
              <Input label="Telefone (opcional)" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+351 912 345 678" />
            )}
          </div>

          {/* Envio */}
          {product.shippingOptions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[#111827] font-semibold text-base">Método de envio</h2>
              <div className="space-y-2">
                {product.shippingOptions.map((opt: ShippingOption) => (
                  <label key={opt.id} className={clsx(
                    'flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all',
                    selectedShip === opt.id ? 'border-[#635bff] bg-[#f5f4ff]' : 'border-[#e5e7eb] hover:border-[#c7c4ff]',
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
                        selectedShip === opt.id ? 'border-[#635bff]' : 'border-[#d1d5db]',
                      )}>
                        {selectedShip === opt.id && <div className="w-2 h-2 rounded-full bg-[#635bff]" />}
                      </div>
                      <span className="text-[#111827] text-sm font-medium">{opt.label}</span>
                    </div>
                    <span className="text-[#374151] text-sm font-semibold">
                      {opt.price === 0 ? 'Grátis' : fmt(opt.price, product.currency)}
                    </span>
                    <input type="radio" name="shipping" value={opt.id} checked={selectedShip === opt.id}
                      onChange={() => setSelectedShip(opt.id)} className="sr-only" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Order Bumps */}
          {product.orderBumps.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-[#111827] font-semibold text-base">Adicionar ao pedido</h2>
              {product.orderBumps.map(bump => (
                <OrderBumpCard
                  key={bump.id} bump={bump} currency={product.currency}
                  selected={selectedBumps.includes(bump.id)}
                  onToggle={() => setSelectedBumps(prev =>
                    prev.includes(bump.id) ? prev.filter(id => id !== bump.id) : [...prev, bump.id]
                  )}
                />
              ))}
            </div>
          )}

          {formError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
              <span>⚠</span> {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#635bff] hover:bg-[#5851db] text-white rounded-lg text-[15px] font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin" /> A preparar…</>
              : <><Lock size={14} /> Continuar para pagamento</>
            }
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[#111827] font-semibold text-base">Pagamento</h2>
            <button onClick={() => setStep('form')} className="text-[#635bff] text-sm hover:underline">
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
                    colorPrimary:    '#635bff',
                    colorBackground: '#ffffff',
                    colorText:       '#111827',
                    colorDanger:     '#ef4444',
                    fontFamily:      'Inter, system-ui, sans-serif',
                    borderRadius:    '8px',
                    spacingUnit:     '4px',
                  },
                  rules: {
                    '.Input': { border: '1px solid #d1d5db', boxShadow: 'none', padding: '10px 14px' },
                    '.Input:focus': { border: '1px solid #635bff', boxShadow: '0 0 0 3px rgba(99,91,255,0.15)' },
                    '.Label': { fontSize: '13px', fontWeight: '500', color: '#374151' },
                    '.Tab': { border: '1px solid #e5e7eb', boxShadow: 'none' },
                    '.Tab--selected': { border: '1px solid #635bff', boxShadow: '0 0 0 1px #635bff' },
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
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f9fafb] font-sans">
      {/* Mobile: coluna única */}
      <div className="lg:hidden">
        {/* Header mobile */}
        <div className="bg-white border-b border-[#e5e7eb] px-5 py-4 flex items-center gap-3">
          {product.logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={product.logoUrl} alt={product.brandName || product.name} className="h-7 object-contain" />
            : <span className="text-[#111827] font-bold text-base">{product.brandName || product.name}</span>
          }
        </div>

        {/* Resumo colapsável mobile */}
        <details className="bg-[#f5f4ff] border-b border-[#e5e7eb]">
          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
            <div className="flex items-center gap-2 text-[#635bff] text-sm font-medium">
              <ChevronDown size={14} />
              <span>Ver resumo do pedido</span>
            </div>
            <span className="text-[#111827] font-bold text-base">{fmt(total, product.currency)}</span>
          </summary>
          <div className="px-5 pb-5 bg-white">
            <SummaryPanel />
          </div>
        </details>

        <div className="px-5 py-6">
          <FormPanel />
        </div>
      </div>

      {/* Desktop: duas colunas */}
      <div className="hidden lg:flex min-h-screen">
        {/* Coluna esquerda — resumo */}
        <div className="w-[45%] xl:w-[42%] bg-white border-r border-[#e5e7eb] flex justify-end">
          <div className="w-full max-w-md px-12 py-12">
            <SummaryPanel />
          </div>
        </div>

        {/* Coluna direita — formulário */}
        <div className="flex-1 bg-[#f9fafb] flex justify-start">
          <div className="w-full max-w-md px-12 py-12">
            <FormPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
