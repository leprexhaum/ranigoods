'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { CheckoutProduct } from '@/lib/types/checkout'
import StripeSplitCheckout   from './templates/StripeSplitCheckout'

function CheckoutSkeleton() {
  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .sk-pulse { animation: skeleton-pulse 1.5s ease-in-out infinite; }
        .sk-bar { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .sk-bar-light { background: #e5e7eb; border-radius: 4px; }
      `}</style>
      <div style={{
        display: 'flex', flexDirection: 'row', minHeight: '100vh',
        background: 'linear-gradient(to right, #012B5D 50%, #FFFFFF 50%)',
        fontFamily: "'Be Vietnam Pro', -apple-system, sans-serif",
      }}>
        {/* Left panel skeleton */}
        <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '420px', padding: '48px 80px 48px 24px' }}>
            <div className="sk-pulse sk-bar" style={{ height: '28px', width: '120px', marginBottom: '40px' }} />
            <div className="sk-pulse sk-bar" style={{ height: '160px', width: '160px', borderRadius: '12px', marginBottom: '20px' }} />
            <div className="sk-pulse sk-bar" style={{ height: '18px', width: '70%', marginBottom: '10px' }} />
            <div className="sk-pulse sk-bar" style={{ height: '14px', width: '50%', marginBottom: '8px' }} />
            <div className="sk-pulse sk-bar" style={{ height: '24px', width: '30%', marginTop: '16px' }} />
          </div>
        </div>

        {/* Right panel skeleton */}
        <div style={{ width: '50%', display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ width: '100%', maxWidth: '480px', padding: '48px 24px 48px 48px' }}>
            <div className="sk-pulse sk-bar-light" style={{ height: '16px', width: '140px', marginBottom: '16px' }} />
            <div style={{ marginBottom: '24px' }}>
              <div className="sk-pulse sk-bar-light" style={{ height: '36px', width: '100%', marginBottom: '2px', borderRadius: '6px 6px 0 0' }} />
              <div className="sk-pulse sk-bar-light" style={{ height: '36px', width: '100%', borderRadius: '0 0 6px 6px' }} />
            </div>
            <div className="sk-pulse sk-bar-light" style={{ height: '16px', width: '120px', marginBottom: '16px' }} />
            <div style={{ marginBottom: '24px' }}>
              <div className="sk-pulse sk-bar-light" style={{ height: '36px', width: '100%', marginBottom: '2px', borderRadius: '6px 6px 0 0' }} />
              <div className="sk-pulse sk-bar-light" style={{ height: '36px', width: '100%', marginBottom: '2px' }} />
              <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                <div className="sk-pulse sk-bar-light" style={{ height: '36px', width: '50%' }} />
                <div className="sk-pulse sk-bar-light" style={{ height: '36px', width: '50%' }} />
              </div>
              <div className="sk-pulse sk-bar-light" style={{ height: '36px', width: '100%', borderRadius: '0 0 6px 6px' }} />
            </div>
            <div className="sk-pulse sk-bar-light" style={{ height: '16px', width: '160px', marginBottom: '16px' }} />
            <div className="sk-pulse sk-bar-light" style={{ height: '40px', width: '100%', borderRadius: '6px', marginBottom: '8px' }} />
            <div className="sk-pulse sk-bar-light" style={{ height: '40px', width: '100%', borderRadius: '6px', marginBottom: '32px' }} />
            <div className="sk-pulse" style={{ height: '44px', width: '100%', borderRadius: '6px', background: 'rgba(255,240,42,0.3)' }} />
          </div>
        </div>
      </div>
    </>
  )
}

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product,     setProduct]     = useState<CheckoutProduct | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError,   setPageError]   = useState('')
  const [fadeIn,      setFadeIn]      = useState(false)

  useEffect(() => {
    fetch(`/api/checkout/${slug}`)
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d?.error ?? 'Produto não encontrado')
        return d as CheckoutProduct
      })
      .then(d => {
        setProduct(d)
        // Trigger fade-in after a frame
        requestAnimationFrame(() => setFadeIn(true))
      })
      .catch(() => setPageError('Produto não encontrado'))
      .finally(() => setPageLoading(false))
  }, [slug])

  if (pageLoading) {
    return <CheckoutSkeleton />
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

  return (
    <div style={{ opacity: fadeIn ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>
      <StripeSplitCheckout product={product} />
    </div>
  )
}
