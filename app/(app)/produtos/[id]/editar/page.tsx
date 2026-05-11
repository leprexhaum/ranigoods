'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import ProductForm from '@/components/products/ProductForm'
import type { Product } from '@/lib/services/product.service'

export default function EditarProdutoPage() {
  const params = useParams()
  const id = params.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Produto não encontrado')
        return r.json()
      })
      .then(setProduct)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-ep-muted">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Carregando produto…</span>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-ep-danger/10 border border-ep-danger/20 rounded-lg p-4 text-ep-danger text-sm">
          {error || 'Produto não encontrado'}
        </div>
      </div>
    )
  }

  return <ProductForm product={product} />
}
