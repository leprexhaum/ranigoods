'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { CheckoutProduct } from '@/lib/types/checkout'
import SingleStepCheckout   from './templates/SingleStepCheckout'
import PromoCheckout         from './templates/PromoCheckout'
import InfoProductCheckout   from './templates/InfoProductCheckout'
import DropshippingCheckout  from './templates/DropshippingCheckout'

const TEMPLATES = {
  single_step:  SingleStepCheckout,
  promo:        PromoCheckout,
  info_product: InfoProductCheckout,
  dropshipping: DropshippingCheckout,
} as const

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product,     setProduct]     = useState<CheckoutProduct | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError,   setPageError]   = useState('')

  useEffect(() => {
    fetch(`/api/checkout/${slug}`)
      .then(r => r.json())
      .then((d: CheckoutProduct) => setProduct(d))
      .catch(() => setPageError('Produto não encontrado'))
      .finally(() => setPageLoading(false))
  }, [slug])

  if (pageLoading) {
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

  if (pageError || !product) {
    return (
      <div className="min-h-screen bg-[#F6F9FC] flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-[#30313D] font-semibold text-lg">Produto não encontrado</p>
          <p className="text-[#6D6E78] text-sm">Verifique o link e tente novamente.</p>
        </div>
      </div>
    )
  }

  const Template = TEMPLATES[product.checkoutTemplate] ?? SingleStepCheckout
  return <Template product={product} />
}
