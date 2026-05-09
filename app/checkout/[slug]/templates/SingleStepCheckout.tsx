'use client'

import { useState, useEffect, useMemo } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { captureUrlParams, getStoredUrlParams } from '@/lib/url-params'
import { useCheckoutPixels } from '@/lib/hooks/useCheckoutPixels'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import type { CheckoutProduct, ShippingOption } from '@/lib/types/checkout'
import { AddressForm, emptyAddress } from '../components/AddressForm'
import type { AddressData } from '../components/AddressForm'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

// ─── Stripe SVG Logo ──────────────────────────────────────────────────────────

function StripeLogo() {
  return (
    <svg viewBox="0 0 60 25" className="h-[14px] inline-block" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a10.7 10.7 0 01-4.56.95c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.63zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 013.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.03 6.26c.4.44.98.78 1.94.78 1.52 0 2.54-1.65 2.54-3.9 0-2.18-1.04-3.95-2.54-3.95zM28.24 5.57h4.13V20h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.87zm-4.32 9.35v9.78H19.8V5.57h3.7l.12 1.22c.86-1.75 2.6-1.5 3.1-1.32v3.8c-.49-.16-2.29-.43-2.8.95zm-9.55 4.62c0 2.18 2.3 1.5 2.76 1.32V20c-.52.26-1.5.3-2.4.3-2.47 0-4.36-1.62-4.36-4.08V8.88H8.2V5.57h2.17V2.44l4.12-.88v4.01h2.76v3.31h-2.76v5.96zM4.2 12.13c0 .73.57 1 1.48 1.37 1.57.62 3.89 1.54 3.9 4.44C9.58 20.8 7.27 22 4.14 22c-1.42 0-2.96-.3-4.14-.86v-3.76c1.13.6 2.7 1.06 4.14 1.06.94 0 1.62-.19 1.62-.9 0-.76-.7-1.07-1.7-1.5C2.4 15.4 0 14.48 0 11.53 0 8.3 2.46 7.3 5.02 7.3c1.29 0 2.6.24 3.7.7v3.7c-.9-.47-2.28-.87-3.7-.87-.8 0-1.52.17-1.52.8-.01.5.3.77.7.5z" fill="#8792A2"/>
    </svg>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-[#F6F9FC] font-sans">
      <style>{`
        @keyframes sk-shimmer {
          0% { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .sk {
          background: linear-gradient(90deg, #E0E6EB 25%, #EEF2F6 50%, #E0E6EB 75%);
          background-size: 600px 100%;
          animation: sk-shimmer 1.5s infinite linear;
          border-radius: 4px;
        }
      `}</style>

      <div className="lg:flex lg:min-h-screen">

        {/* Coluna esquerda — resumo */}
        <div className="lg:w-[45%] bg-[#F6F9FC] lg:flex lg:justify-end">
          <div className="w-full lg:max-w-[480px] px-6 lg:px-12 pt-16 pb-10 space-y-6">
            {/* Logo + nome */}
            <div className="flex items-center gap-3">
              <div className="sk w-8 h-8 rounded-full flex-shrink-0" />
              <div className="sk w-32 h-4" />
            </div>
            {/* Produto */}
            <div className="space-y-2 pt-2">
              <div className="sk w-48 h-5" />
              <div className="sk w-28 h-9" />
            </div>
            {/* Descrição */}
            <div className="space-y-2">
              <div className="sk w-full h-3" />
              <div className="sk w-4/5 h-3" />
            </div>
            {/* Divisor */}
            <div className="border-t border-[#E0E6EB]" />
            {/* Line items */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="sk w-36 h-3" />
                <div className="sk w-16 h-3" />
              </div>
              <div className="flex justify-between">
                <div className="sk w-20 h-3" />
                <div className="sk w-16 h-3" />
              </div>
            </div>
            {/* Divisor */}
            <div className="border-t border-[#E0E6EB]" />
            {/* Total */}
            <div className="flex justify-between items-center">
              <div className="sk w-24 h-3" />
              <div className="sk w-20 h-4" />
            </div>
            {/* Powered by */}
            <div className="pt-4 flex items-center gap-1">
              <div className="sk w-20 h-3" />
              <div className="sk w-12 h-3" />
            </div>
          </div>
        </div>

        {/* Coluna direita — formulário */}
        <div className="lg:flex-1 bg-white lg:flex lg:justify-start">
          <div className="w-full lg:max-w-[480px] px-6 lg:px-12 pt-16 pb-10 space-y-5">
            {/* Label contacto */}
            <div className="sk w-36 h-3" />
            {/* Inputs agrupados */}
            <div>
              <div className="sk w-full h-12 rounded-t-[5px] rounded-b-none" style={{ animationDelay: '0ms' }} />
              <div className="sk w-full h-12 rounded-none mt-px" style={{ animationDelay: '60ms' }} />
              <div className="sk w-full h-12 rounded-b-[5px] rounded-t-none mt-px" style={{ animationDelay: '120ms' }} />
            </div>
            {/* Label pagamento */}
            <div className="sk w-40 h-3 mt-2" />
            {/* Payment element placeholder */}
            <div className="sk w-full h-[180px] rounded-[5px]" style={{ animationDelay: '180ms' }} />
            {/* Botão */}
            <div className="sk w-full h-12 rounded-[5px]" style={{ animationDelay: '240ms' }} />
            {/* Segurança */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="sk w-3 h-3 rounded-full" />
              <div className="sk w-48 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Payment Form (dentro de Elements) ───────────────────────────────────────

function PaymentForm({ paymentId, successUrl, amount, currency, brandName, legalName, onAddPaymentInfo }: {
  paymentId: string; successUrl: string; amount: number; currency: string; brandName: string; legalName: string; onAddPaymentInfo?: () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [polling,  setPolling]  = useState(false)

  const pollAndRedirect = async () => {
    setPolling(true)
    // Passa status=paid no URL para o SuccessContent não precisar de fazer polling
    const successDest = successUrl || `${window.location.origin}/checkout/success?payment_id=${paymentId}&status=paid`
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
        // Intervalo reduzido de 3s para 1.5s para resposta mais rápida
        if (attempts < 30) { attempts++; setTimeout(poll, 1500) }
        else { window.location.href = successDest }
      } catch {
        if (attempts < 30) { attempts++; setTimeout(poll, 1500) }
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
    onAddPaymentInfo?.()
    const returnUrl = successUrl || `${window.location.origin}/checkout/success?payment_id=${paymentId}`
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    })
    if (err) { setError(err.message ?? 'Erro ao processar pagamento'); setLoading(false); return }
    if (paymentIntent) { pollAndRedirect(); return }
    // redirect happened (MBWay, etc.) — loading stays true
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
          <span className="mt-0.5">⚠</span> {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full h-12 flex items-center justify-center gap-2 bg-[#0570DE] hover:bg-[#0461c4] text-white text-[15px] font-semibold rounded-[5px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading
          ? <><Loader2 size={16} className="animate-spin" /> A processar…</>
          : <>Pagar {fmt(amount, currency)}</>
        }
      </button>
      <p className="text-[12px] text-[#6D6E78] leading-relaxed text-center">
        Ao confirmar, autoriza a <strong className="font-medium text-[#30313D]">{legalName || brandName}</strong> a efetuar cobranças conforme as condições acordadas.
      </p>
    </form>
  )
}

// ─── Order Summary (coluna esquerda) ─────────────────────────────────────────

interface OrderSummaryProps {
  product: CheckoutProduct
  total: number
  selectedBumps: string[]
  selectedShip: string
  descExpanded: boolean
  setDescExpanded: React.Dispatch<React.SetStateAction<boolean>>
  intervalLabel: string | null
}

function OrderSummary({ product, total, selectedBumps, selectedShip, descExpanded, setDescExpanded, intervalLabel }: OrderSummaryProps) {
  const brandName = product.brandName || product.name
  const subtotal = total

  return (
    <div className="space-y-0">

      {/* Imagem do produto */}
      {product.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt={product.name} className="w-32 h-32 rounded-lg object-cover mb-4 border border-[#E0E6EB]" />
      )}

      {/* Nome do produto + preço */}
      <div className="pb-5">
        <h2 className="text-[16px] font-medium text-[#6D6E78] mb-2">{product.name}</h2>
        <div className="flex items-baseline gap-2">
          <span className="text-[36px] font-semibold text-[#30313D] leading-none tabular-nums">
            {fmt(product.price, product.currency)}
          </span>
          {intervalLabel && (
            <span className="text-[14px] text-[#6D6E78]">
              <div>por <br className="hidden" />{intervalLabel.replace('por ', '')}</div>
            </span>
          )}
        </div>

        {/* Descrição colapsável */}
        {product.description && (
          <div className="mt-3">
            <p className={clsx('text-[14px] font-medium text-[#6D6E78] leading-relaxed', !descExpanded && 'line-clamp-2')}>
              {product.description}
            </p>
            <button
              type="button"
              onClick={() => setDescExpanded(v => !v)}
              className="mt-1 flex items-center gap-1 text-[12px] text-[#6D6E78] hover:text-[#30313D]"
            >
              {descExpanded ? <><ChevronUp size={11} /> Menos</> : <><ChevronDown size={11} /> Mais</>}
            </button>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="py-5 border-t border-[#E0E6EB] space-y-4">
        {/* Item principal */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[#30313D] leading-snug">{product.name}</p>
            {product.description && (
              <p className="text-[12px] text-[#8792A2] mt-0.5 line-clamp-2 leading-relaxed">{product.description}</p>
            )}
            {intervalLabel && (
              <p className="text-[12px] text-[#8792A2] mt-0.5">Cobrado {intervalLabel.replace('por ', '')}</p>
            )}
          </div>
          <span className="text-[14px] font-medium text-[#30313D] tabular-nums flex-shrink-0">
            {fmt(product.price, product.currency)}
          </span>
        </div>

        {/* Order bumps */}
        {selectedBumps.map(id => {
          const b = product.orderBumps.find(b => b.id === id)
          if (!b) return null
          return (
            <div key={id} className="flex items-start justify-between gap-4">
              <p className="text-[14px] font-medium text-[#30313D] flex-1">{b.name}</p>
              <span className="text-[14px] font-medium text-[#30313D] tabular-nums flex-shrink-0">
                +{fmt(b.price, product.currency)}
              </span>
            </div>
          )
        })}

        {/* Envio */}
        {selectedShip && (() => {
          const s = product.shippingOptions.find(s => s.id === selectedShip)
          if (!s || s.price === 0) return null
          return (
            <div className="flex items-start justify-between gap-4">
              <p className="text-[14px] font-medium text-[#30313D] flex-1">{s.label}</p>
              <span className="text-[14px] font-medium text-[#30313D] tabular-nums flex-shrink-0">
                +{fmt(s.price, product.currency)}
              </span>
            </div>
          )
        })()}
      </div>

      {/* Subtotal + Total */}
      <div className="pt-4 border-t border-[#E0E6EB] space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[14px] font-medium text-[#30313D]">Subtotal</span>
          <span className="text-[14px] font-semibold text-[#30313D] tabular-nums">{fmt(subtotal, product.currency)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[14px] font-medium text-[#30313D]">Total devido hoje</span>
          <span className="text-[16px] font-semibold text-[#30313D] tabular-nums">{fmt(total, product.currency)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Checkout Form (coluna direita) ──────────────────────────────────────────

interface CheckoutFormProps {
  product: CheckoutProduct
  brandName: string
  email: string; setEmail: (v: string) => void
  name: string;  setName:  (v: string) => void
  phone: string; setPhone: (v: string) => void
  countryCode: string; callingCode: string
  selectedShip: string; setSelectedShip: (v: string) => void
  selectedBumps: string[]
  address: AddressData; setAddress: (v: AddressData) => void
  formError: string
  submitting: boolean
  handleProceed: (e: React.FormEvent) => void
  clientSecret: string
  stripePromise: ReturnType<typeof loadStripe> | null
  paymentId: string
  paymentAmount: number
  onAddPaymentInfo?: () => void
}

function CheckoutForm({
  product, brandName,
  email, setEmail, name, setName, phone, setPhone,
  countryCode, callingCode,
  selectedShip, setSelectedShip,
  address, setAddress,
  formError, submitting, handleProceed,
  clientSecret, stripePromise, paymentId, paymentAmount,
  onAddPaymentInfo,
}: CheckoutFormProps) {
  const [nameError, setNameError] = useState('')

  const validateName = (v: string) => {
    const parts = v.trim().split(/\s+/).filter(Boolean)
    setNameError(parts.length < 2 ? 'Introduza pelo menos nome e apelido' : '')
  }

  const updatePayment = (fields: { customerName?: string; customerEmail?: string; customerPhone?: string }) => {
    if (!paymentId) return
    fetch(`/api/checkout/payment/${paymentId}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    }).catch(() => {/* silent — não bloqueia o utilizador */})
  }

  const fieldWrapTop    = 'relative flex items-center bg-white border border-[#E0E6EB] rounded-t-[5px] focus-within:border-[#0570DE] focus-within:shadow-[0_0_0_3px_rgba(5,112,222,0.16)] focus-within:z-10 transition-all'
  const fieldWrapMid    = 'relative flex items-center bg-white border-l border-r border-b border-[#E0E6EB] focus-within:border-[#0570DE] focus-within:shadow-[0_0_0_3px_rgba(5,112,222,0.16)] focus-within:z-10 transition-all'
  const fieldWrapBottom = 'relative flex items-center bg-white border-l border-r border-b border-[#E0E6EB] rounded-b-[5px] focus-within:border-[#0570DE] focus-within:shadow-[0_0_0_3px_rgba(5,112,222,0.16)] focus-within:z-10 transition-all'
  const inputBase = 'flex-1 h-12 bg-transparent text-[15px] text-[#30313D] placeholder-[#8792A2] pl-2 pr-3 focus:outline-none'

  return (
    <div className="space-y-6">

      {/* Contacto */}
      <div>
        <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide mb-2">Informações de contacto</p>
        <div>
          {/* Email */}
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
          {/* Nome */}
          <div className={fieldWrapMid}>
            <span className="pl-3 flex-shrink-0">
              <svg focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M2.5 14.4H13.5C13.7209 14.4 13.9 14.2209 13.9 14C13.9 12.1222 12.3778 10.6 10.5 10.6H5.5C3.62223 10.6 2.1 12.1222 2.1 14C2.1 14.2209 2.27909 14.4 2.5 14.4ZM2.5 16H13.5C14.6046 16 15.5 15.1046 15.5 14C15.5 11.2386 13.2614 9 10.5 9H5.5C2.73858 9 0.5 11.2386 0.5 14C0.5 15.1046 1.39543 16 2.5 16Z" fill="#1A1A1A" fillOpacity="0.5"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M8 6.4C9.32548 6.4 10.4 5.32548 10.4 4C10.4 2.67452 9.32548 1.6 8 1.6C6.67452 1.6 5.6 2.67452 5.6 4C5.6 5.32548 6.67452 6.4 8 6.4ZM8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" fill="#1A1A1A" fillOpacity="0.5"/>
              </svg>
            </span>
            <input
              className={inputBase}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); if (nameError) validateName(e.target.value) }}
              onBlur={e => {
                validateName(e.target.value)
                if (e.target.value.trim()) updatePayment({ customerName: e.target.value.trim() })
              }}
              placeholder="Nome"
              required
              autoComplete="name"
            />
          </div>
          {nameError && <p className="text-[12px] text-red-500 px-1 pt-1">{nameError}</p>}
          {/* Telefone com bandeira dinâmica via geo-ip */}
          <div className={fieldWrapBottom}>
            <span className="pl-3 flex-shrink-0 flex items-center gap-1.5">
              <img
                src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
                alt={countryCode}
                className="w-5 h-auto"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span className="text-[13px] text-[#30313D]">{callingCode}</span>
            </span>
            <input className={inputBase} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="912 345 678" required={product.requirePhone} autoComplete="tel"
              onBlur={e => { if (e.target.value.trim()) updatePayment({ customerPhone: e.target.value.trim() }) }}
            />
          </div>
        </div>
      </div>

      {/* Endereço (só quando requireAddress) */}
      {product.requireAddress && (
        <AddressForm
          contactName={name}
          data={address}
          onChange={setAddress}
          required={true}
        />
      )}

      {/* Envio */}
      {product.shippingOptions.length > 0 && (
        <div>
          <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide mb-2">Método de envio</p>
          <div className="border border-[#E0E6EB] rounded-[5px] overflow-hidden divide-y divide-[#E0E6EB]">
            {product.shippingOptions.map((opt: ShippingOption) => (
              <label key={opt.id} className={clsx(
                'flex items-center justify-between gap-3 px-4 py-3 cursor-pointer transition-colors',
                selectedShip === opt.id ? 'bg-[#F0F7FF]' : 'hover:bg-[#F6F9FC]',
              )}>
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    selectedShip === opt.id ? 'border-[#0570DE]' : 'border-[#C0C8D2]',
                  )}>
                    {selectedShip === opt.id && <div className="w-2 h-2 rounded-full bg-[#0570DE]" />}
                  </div>
                  <span className="text-[14px] text-[#30313D]">{opt.label}</span>
                </div>
                <span className="text-[14px] font-medium text-[#30313D]">
                  {opt.price === 0 ? 'Grátis' : fmt(opt.price, product.currency)}
                </span>
                <input type="radio" name="shipping" value={opt.id} checked={selectedShip === opt.id}
                  onChange={() => setSelectedShip(opt.id)} className="sr-only" />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Erro do formulário */}
      {formError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-[5px] p-3 text-red-600 text-sm">
          <span>⚠</span> {formError}
        </div>
      )}

      {/* Pagamento */}
      <div>
        <p className="text-[12px] font-medium text-[#30313D] uppercase tracking-wide mb-3">Forma de pagamento</p>
        {!clientSecret ? (
          <div className="w-full h-12 flex items-center justify-center rounded-[5px] text-[13px] text-[#8792A2]">
            <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A preparar pagamento…</span>
          </div>
        ) : (
          stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary:    '#0570DE',
                    colorBackground: '#ffffff',
                    colorText:       '#30313D',
                    colorDanger:     '#df1b41',
                    fontFamily:      'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    borderRadius:    '5px',
                    spacingUnit:     '4px',
                  },
                  rules: {
                    '.Input': { border: '1px solid #E0E6EB', boxShadow: 'none', padding: '12px' },
                    '.Input:focus': { border: '1px solid #0570DE', boxShadow: '0 0 0 3px rgba(5,112,222,0.16)' },
                    '.Label': { fontSize: '12px', fontWeight: '500', color: '#30313D', textTransform: 'uppercase', letterSpacing: '0.05em' },
                    '.Tab': { border: '1px solid #E0E6EB', boxShadow: 'none' },
                    '.Tab--selected': { border: '1px solid #0570DE', boxShadow: '0 0 0 1px #0570DE' },
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
                legalName={product.legalName || ''}
                onAddPaymentInfo={onAddPaymentInfo}
              />
            </Elements>
          )
        )}
      </div>

      {/* Footer idêntico ao Stripe */}
      <footer className="flex items-center justify-center gap-4 pt-2">
        <a href="https://stripe.com" target="_blank" rel="noopener" className="flex items-center gap-1 text-[12px] text-[#8792A2] hover:text-[#6D6E78]">
          Powered by&nbsp;
          <svg focusable="false" width="33" height="15" role="img" aria-labelledby="stripe-title" viewBox="0 0 32.956 12">
            <title id="stripe-title">Stripe</title>
            <g fillRule="evenodd" fill="#8792A2">
              <path d="M32.956 7.925c0-2.313-1.12-4.138-3.261-4.138-2.15 0-3.451 1.825-3.451 4.12 0 2.719 1.535 4.092 3.74 4.092 1.075 0 1.888-.244 2.502-.587V9.605c-.614.307-1.319.497-2.213.497-.876 0-1.653-.307-1.753-1.373h4.418c0-.118.018-.588.018-.804zm-4.463-.859c0-1.02.624-1.445 1.193-1.445.55 0 1.138.424 1.138 1.445h-2.33zM22.756 3.787c-.885 0-1.454.415-1.77.704l-.118-.56H18.88v10.535l2.259-.48.009-2.556c.325.235.804.57 1.6.57 1.616 0 3.089-1.302 3.089-4.166-.01-2.62-1.5-4.047-3.08-4.047zm-.542 6.225c-.533 0-.85-.19-1.066-.425l-.009-3.352c.235-.262.56-.443 1.075-.443.822 0 1.391.922 1.391 2.105 0 1.211-.56 2.115-1.39 2.115zM18.04 2.766V.932l-2.268.479v1.843zM15.772 3.94h2.268v7.905h-2.268zM13.342 4.609l-.144-.669h-1.952v7.906h2.259V6.488c.533-.696 1.436-.57 1.716-.47V3.94c-.289-.108-1.346-.307-1.879.669zM8.825 1.98l-2.205.47-.009 7.236c0 1.337 1.003 2.322 2.34 2.322.741 0 1.283-.135 1.581-.298V9.876c-.289.117-1.716.533-1.716-.804V5.865h1.716V3.94H8.816l.009-1.96zM2.718 6.235c0-.352.289-.488.767-.488.687 0 1.554.208 2.241.578V4.202a5.958 5.958 0 0 0-2.24-.415c-1.835 0-3.054.957-3.054 2.557 0 2.493 3.433 2.096 3.433 3.17 0 .416-.361.552-.867.552-.75 0-1.708-.307-2.467-.723v2.15c.84.362 1.69.515 2.467.515 1.879 0 3.17-.93 3.17-2.548-.008-2.692-3.45-2.213-3.45-3.225z"/>
            </g>
          </svg>
        </a>
        <a href="https://stripe.com/legal/end-users" target="_blank" rel="noopener" className="text-[12px] text-[#8792A2] hover:text-[#6D6E78]">Termos</a>
        <a href="https://stripe.com/privacy" target="_blank" rel="noopener" className="text-[12px] text-[#8792A2] hover:text-[#6D6E78]">Privacidade</a>
      </footer>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SingleStepCheckout({ product }: { product: CheckoutProduct }) {
  const { trackEvent } = useCheckoutPixels(product.id)

  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [phone,         setPhone]         = useState('')
  const [address,       setAddress]       = useState<AddressData>(emptyAddress())
  const [selectedBumps, setSelectedBumps] = useState<string[]>([])
  const [selectedShip,  setSelectedShip]  = useState('')
  const [formError,     setFormError]     = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [descExpanded,  setDescExpanded]  = useState(false)
  const [summaryOpen,   setSummaryOpen]   = useState(false)
  const [countryCode,   setCountryCode]   = useState('PT')
  const [callingCode,   setCallingCode]   = useState('+351')

  const [clientSecret,   setClientSecret]   = useState('')
  const [publishableKey, setPublishableKey] = useState('')
  const [paymentId,      setPaymentId]      = useState('')
  const [paymentAmount,  setPaymentAmount]  = useState(0)

  useEffect(() => {
    captureUrlParams()
    const ship = product.shippingOptions?.length > 0 ? product.shippingOptions[0].id : ''
    if (ship) setSelectedShip(ship)
    createPaymentIntent(product, ship)
    trackEvent('InitiateCheckout', { value: product.price, currency: product.currency, content_ids: [product.id] })
    // Detectar país via geo-ip para bandeira e código de chamada dinâmicos
    fetch('/api/geo-ip').then(r => r.json()).then(d => {
      if (d.countryCode) setCountryCode(d.countryCode)
      if (d.callingCode) setCallingCode(d.callingCode)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = product.price
    + selectedBumps.reduce((s, id) => s + (product.orderBumps.find(b => b.id === id)?.price ?? 0), 0)
    + (product.shippingOptions.find(s => s.id === selectedShip)?.price ?? 0)

  const createPaymentIntent = async (prod: CheckoutProduct, ship: string) => {
    setSubmitting(true)
    try {
      const urlParams = getStoredUrlParams()

      const res = await fetch(`/api/checkout/${prod.slug}/payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName:  name || '',
          customerEmail: email || '',
          customerPhone: phone,
          bumpIds:       selectedBumps,
          shippingId:    ship || undefined,
          urlParams,
          address: product.requireAddress && address.line1 ? {
            line1:      address.line1,
            line2:      address.line2 || undefined,
            locality:   address.locality || undefined,
            city:       address.city || address.locality,
            postalCode: address.postalCode,
            country:    address.country.replace(/^PT-.*/, 'PT'),
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

  const handleProceed = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    await createPaymentIntent(product, selectedShip)
  }

  const intervalLabel = product.interval && product.interval !== 'unit'
    ? product.interval === 'month' ? 'por mês'
    : product.interval === 'year'  ? 'por ano'
    : product.interval === 'week'  ? 'por semana'
    : `por ${product.interval}`
    : null

  const stripePromise = useMemo(
    () => loadStripe(publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''),
    [publishableKey],
  )

  const brandName = product.brandName || product.name

  return (
    <div className="min-h-screen bg-[#F6F9FC] font-sans">

      {/* Mobile — header com logo + marca + botão detalhes */}
      <div className="lg:hidden bg-white border-b border-[#E0E6EB]">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            {product.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.logoUrl} alt={brandName} className="h-8 w-auto max-w-[140px] object-contain flex-shrink-0" />
            ) : (
              <span className="text-[14px] font-medium text-[#30313D] truncate">{brandName}</span>
            )}
          </div>

          {/* Botão Detalhes */}
          <button
            type="button"
            onClick={() => setSummaryOpen(v => !v)}
            className="flex items-center gap-1 text-[13px] text-[#30313D] hover:text-[#0570DE] transition-colors flex-shrink-0 ml-3"
          >
            <span>{summaryOpen ? 'Fechar' : 'Detalhes'}</span>
            <svg
              focusable="false"
              viewBox="0 0 12 12"
              className={clsx('w-3 h-3 transition-transform duration-200', summaryOpen && 'rotate-180')}
            >
              <path d="M10.193 3.97a.75.75 0 0 1 1.062 1.062L6.53 9.756a.75.75 0 0 1-1.06 0L.745 5.032A.75.75 0 0 1 1.807 3.97L6 8.163l4.193-4.193z" fillRule="evenodd" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Painel expansível com animação */}
        <div
          className={clsx(
            'overflow-hidden transition-all duration-300 ease-in-out',
            summaryOpen ? 'max-h-[1200px] opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="px-4 pb-5 pt-2 bg-[#F6F9FC] border-t border-[#E0E6EB]">
            <OrderSummary
              product={product} total={total}
              selectedBumps={selectedBumps} selectedShip={selectedShip}
              descExpanded={descExpanded} setDescExpanded={setDescExpanded}
              intervalLabel={intervalLabel}
            />
          </div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="lg:flex lg:min-h-screen">

        {/* Coluna esquerda — resumo (desktop/tablet) */}
        <div className="hidden lg:flex lg:w-[45%] bg-[#F6F9FC] justify-end border-r border-[#E0E6EB]">
          <div className="w-full max-w-[480px] px-12 pt-10 pb-12">
            {/* Header desktop: logo + marca */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2.5">
                {product.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.logoUrl} alt={brandName} className="w-8 h-8 rounded-full object-contain border border-[#E0E6EB] flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#E0E6EB] flex items-center justify-center flex-shrink-0">
                    <svg focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M14.9977 8.19089C15.6092 7.64898 16.0002 6.87952 16.0002 6V5.90012C16.0002 5.58415 15.9687 5.26896 15.9061 4.95925L15.2757 1.83964L15.2729 1.82792C15.1493 1.3036 14.9237 0.814761 14.4989 0.46826C14.0702 0.118638 13.5447 2.32458e-05 13 2.20537e-05L3 0C2.45536 0 1.92982 0.118541 1.50106 0.46812C1.0761 0.814602 0.850422 1.30347 0.726786 1.8279L0.72402 1.83963L0.0936206 4.95927C0.0310375 5.26897 -0.000488281 5.58414 -0.000488281 5.90011V6C-0.000488281 6.87964 0.390631 7.64918 1.00228 8.19109C1.00077 8.21053 1 8.23017 1 8.25V13.75C1 14.9926 2.00736 16 3.25 16H12.75C13.9926 16 15 14.9926 15 13.75V8.25C15 8.2301 14.9992 8.21039 14.9977 8.19089Z" fill="#1A1A1A" fillOpacity="0.5"/>
                    </svg>
                  </div>
                )}
                <span className="text-[14px] font-medium text-[#30313D] truncate">{brandName}</span>
              </div>
            </div>
            <OrderSummary
              product={product} total={total}
              selectedBumps={selectedBumps} selectedShip={selectedShip}
              descExpanded={descExpanded} setDescExpanded={setDescExpanded}
              intervalLabel={intervalLabel}
            />
          </div>
        </div>

        {/* Coluna direita — formulário */}
        <div className="lg:flex-1 bg-white lg:flex lg:justify-start">
          <div className="w-full lg:max-w-[480px] px-4 md:px-10 lg:px-12 py-8 lg:pt-16 lg:pb-12">
            <CheckoutForm
              product={product} brandName={brandName}
              email={email} setEmail={setEmail}
              name={name} setName={setName}
              phone={phone} setPhone={setPhone}
              countryCode={countryCode} callingCode={callingCode}
              selectedShip={selectedShip} setSelectedShip={setSelectedShip}
              selectedBumps={selectedBumps}
              address={address} setAddress={setAddress}
              formError={formError} submitting={submitting}
              handleProceed={handleProceed}
              clientSecret={clientSecret} stripePromise={stripePromise}
              paymentId={paymentId} paymentAmount={paymentAmount}
              onAddPaymentInfo={() => trackEvent('AddPaymentInfo', { value: total, currency: product.currency, content_ids: [product.id] })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
