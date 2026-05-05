'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Loader2, ShoppingCart, AlertCircle } from 'lucide-react'
import type { CartDetail } from '@/lib/services/cart.service'
import { formatCurrency } from '@/lib/utils/currency'
import { useCheckoutPixels } from '@/lib/hooks/useCheckoutPixels'

export default function CartCheckout({ cart }: { cart: CartDetail }) {
  const productIds = cart.items.map(i => i.productId)
  const { trackEvent } = useCheckoutPixels(productIds)

  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    trackEvent('InitiateCheckout', {
      value:        cart.total,
      currency:     cart.currency,
      content_ids:  productIds,
      num_items:    cart.items.reduce((s, i) => s + i.quantity, 0),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    trackEvent('AddPaymentInfo', { value: cart.total, currency: cart.currency, content_ids: productIds })

    try {
      const res  = await fetch(`/api/checkout/cart/${cart.id}/session`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          customerName:  name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          urlParams:     Object.fromEntries(new URLSearchParams(window.location.search)),
        }),
      })
      const data = await res.json() as { sessionUrl?: string; error?: string }

      if (!res.ok || !data.sessionUrl) {
        setError(data.error ?? 'Erro ao iniciar pagamento')
        return
      }

      window.location.href = data.sessionUrl
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const total = cart.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        {/* Header */}
        {(cart.logoUrl || cart.brandName) && (
          <div className="flex items-center gap-3 mb-2">
            {cart.logoUrl && (
              <Image src={cart.logoUrl} alt={cart.brandName} width={40} height={40} className="rounded-md object-contain" />
            )}
            {cart.brandName && <span className="text-[#30313D] font-semibold text-lg">{cart.brandName}</span>}
          </div>
        )}

        {/* Resumo do carrinho */}
        <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E3E8EE] flex items-center gap-2">
            <ShoppingCart size={16} className="text-[#635bff]" />
            <h2 className="text-[#30313D] font-semibold text-sm">Resumo do pedido</h2>
          </div>
          <div className="divide-y divide-[#F0F2F5]">
            {cart.items.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={44}
                    height={44}
                    className="rounded-md object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[#30313D] text-sm font-medium truncate">{item.name}</p>
                  <p className="text-[#6D6E78] text-xs">Qtd: {item.quantity}</p>
                </div>
                <p className="text-[#30313D] text-sm font-semibold flex-shrink-0">
                  {formatCurrency(item.unitPrice * item.quantity, item.currency)}
                </p>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-[#F6F9FC] flex items-center justify-between">
            <span className="text-[#30313D] text-sm font-semibold">Total</span>
            <span className="text-[#635bff] text-base font-bold">{formatCurrency(total, cart.currency)}</span>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handlePay} className="bg-white rounded-xl border border-[#E3E8EE] p-5 space-y-4">
          <h2 className="text-[#30313D] font-semibold text-sm">Dados do comprador</h2>

          <div className="space-y-1">
            <label className="text-[#6D6E78] text-xs font-medium">Nome completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="João Silva"
              className="w-full px-3 py-2.5 border border-[#E3E8EE] rounded-lg text-[#30313D] text-sm placeholder-[#C0C4CC] focus:outline-none focus:border-[#635bff] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#6D6E78] text-xs font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="joao@email.com"
              className="w-full px-3 py-2.5 border border-[#E3E8EE] rounded-lg text-[#30313D] text-sm placeholder-[#C0C4CC] focus:outline-none focus:border-[#635bff] transition-colors"
            />
          </div>

          {cart.requirePhone && (
            <div className="space-y-1">
              <label className="text-[#6D6E78] text-xs font-medium">Telefone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+351 912 345 678"
                className="w-full px-3 py-2.5 border border-[#E3E8EE] rounded-lg text-[#30313D] text-sm placeholder-[#C0C4CC] focus:outline-none focus:border-[#635bff] transition-colors"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#635bff] text-white rounded-lg text-sm font-semibold hover:bg-[#5851e5] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> A processar…</>
            ) : (
              `Pagar ${formatCurrency(total, cart.currency)}`
            )}
          </button>

          <p className="text-[#6D6E78] text-xs text-center">
            Será redirecionado para a página segura de pagamento do Stripe
          </p>
        </form>
      </div>
    </div>
  )
}
