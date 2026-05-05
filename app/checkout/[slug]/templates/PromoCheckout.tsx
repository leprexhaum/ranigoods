'use client'

import { useState, useEffect } from 'react'
import type { CheckoutProduct } from '@/lib/types/checkout'
import SingleStepCheckout from './SingleStepCheckout'

function CountdownTimer({ minutes }: { minutes: number }) {
  const [secs, setSecs] = useState(minutes * 60)

  useEffect(() => {
    if (secs <= 0) return
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [secs])

  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')

  return (
    <span className="font-mono font-bold tabular-nums">
      {m}:{s}
    </span>
  )
}

export default function PromoCheckout({ product }: { product: CheckoutProduct }) {
  return (
    <div>
      <div className="bg-red-600 text-white text-center py-2.5 px-4 text-sm font-medium">
        Oferta por tempo limitado — termina em{' '}
        <CountdownTimer minutes={product.countdownMinutes ?? 15} />
      </div>
      <SingleStepCheckout product={product} />
    </div>
  )
}
