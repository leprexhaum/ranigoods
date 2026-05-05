'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
      <div className="min-h-screen bg-[#F6F9FC] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#635bff]" />
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
