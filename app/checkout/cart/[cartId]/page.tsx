'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Clock } from 'lucide-react'
import type { CartDetail } from '@/lib/services/cart.service'
import CartCheckout from './CartCheckout'

export default function CartCheckoutPage() {
  const { cartId } = useParams<{ cartId: string }>()
  const [cart,    setCart]    = useState<CartDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<{ message: string; expired?: boolean; paid?: boolean } | null>(null)

  useEffect(() => {
    fetch(`/api/checkout/cart/${cartId}`)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) {
          setError({ message: data.error, expired: data.expired, paid: data.paid })
        } else {
          setCart(data as CartDetail)
        }
      })
      .catch(() => setError({ message: 'Erro ao carregar o carrinho' }))
      .finally(() => setLoading(false))
  }, [cartId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F9FC]">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-6 w-32 bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-10 w-full bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-10 w-full bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-10 w-full bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-12 w-full bg-[#d1d5db] rounded animate-pulse mt-4" />
          </div>
          <div className="space-y-4">
            <div className="h-48 w-full bg-[#e5e7eb] rounded-xl animate-pulse" />
            <div className="h-5 w-3/4 bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-[#e5e7eb] rounded animate-pulse" />
            <div className="h-8 w-1/3 bg-[#e5e7eb] rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F6F9FC] flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          <Clock size={40} className="mx-auto text-[#6D6E78]" />
          <p className="text-[#30313D] font-semibold text-lg">
            {error.expired ? 'Carrinho expirado' : error.paid ? 'Pedido já concluído' : 'Carrinho não encontrado'}
          </p>
          <p className="text-[#6D6E78] text-sm">
            {error.expired
              ? 'Este link de carrinho expirou. Solicite um novo link à loja.'
              : error.paid
              ? 'Este pedido já foi pago com sucesso.'
              : error.message}
          </p>
        </div>
      </div>
    )
  }

  if (!cart) return null

  return <CartCheckout cart={cart} />
}
