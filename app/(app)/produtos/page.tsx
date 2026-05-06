'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, ExternalLink, MoreVertical, Check, Pencil, Copy } from 'lucide-react'
import clsx from 'clsx'
import type { Product } from '@/lib/services/product.service'
import ProductFormModal from '@/components/products/ProductFormModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'

function formatCurrency(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(cents / 100)
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/checkout/${slug}`

  const copy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={copy}
        className="text-ep-muted hover:text-ep-accent transition-colors"
        title="Copiar link do checkout"
      >
        {copied ? <Check size={13} className="text-ep-success" /> : <Copy size={13} />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-ep-muted hover:text-ep-accent transition-colors"
        title="Abrir checkout"
      >
        <ExternalLink size={13} />
      </a>
    </div>
  )
}

export default function ProdutosPage() {
  const [filter,      setFilter]      = useState<'all' | 'active' | 'archived'>('all')
  const [products,    setProducts]    = useState<Product[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const { confirmProps, confirm }     = useConfirm()

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      const res = await fetch(`/api/products?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar produtos')
      setProducts(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleArchive = async (id: string, current: 'active' | 'archived') => {
    const next = current === 'active' ? 'archived' : 'active'
    await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    fetchProducts()
  }

  const handleDelete = async (id: string) => {
    confirm({
      title:       'Excluir produto',
      message:     'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      variant:     'danger',
      onConfirm:   async () => {
        await fetch(`/api/products/${id}`, { method: 'DELETE' })
        fetchProducts()
      },
    })
  }

  const handleDuplicate = async (id: string) => {
    setDuplicating(id)
    try {
      await fetch(`/api/products/${id}/duplicate`, { method: 'POST' })
      fetchProducts()
    } finally {
      setDuplicating(null)
    }
  }

  return (
    <>
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Produtos</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            Gerencie seus produtos e preços do Stripe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditProduct(null); setModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-ep-accent text-ep-base rounded-md text-sm font-semibold hover:bg-ep-accent-dark transition-colors">
            <Plus size={14} strokeWidth={2.5} />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1 w-fit">
        {(['all', 'active', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3 py-1.5 rounded text-xs font-medium transition-all capitalize',
              filter === f
                ? 'bg-ep-accent text-ep-base font-semibold'
                : 'text-ep-secondary hover:text-ep-primary'
            )}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Arquivados'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      )}

      {error && (
        <div className="bg-ep-danger/10 border border-ep-danger/20 rounded-lg p-4 text-ep-danger text-sm">
          {error}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-ep-muted gap-3">
          <Package size={32} className="opacity-40" />
          <p className="text-sm">Nenhum produto encontrado</p>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-ep-surface border border-ep-border-default rounded-lg p-5 hover:border-ep-accent/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-ep-accent/10 border border-ep-accent/20 flex items-center justify-center flex-shrink-0">
                    <Package size={16} className="text-ep-accent" />
                  </div>
                  <div>
                    <h3 className="text-ep-primary text-sm font-semibold">{product.name}</h3>
                    <p className="text-ep-muted text-xs font-mono">{product.slug ? `/${product.slug}` : product.stripeId || '—'}</p>
                  </div>
                </div>
                <div className="relative group/menu">
                  <button className="text-ep-muted hover:text-ep-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                    <MoreVertical size={14} />
                  </button>
                  <div className="absolute right-0 top-6 z-10 hidden group-hover/menu:block bg-ep-surface border border-ep-border-default rounded-md shadow-lg min-w-[140px]">
                    <button
                      onClick={() => { setEditProduct(product); setModalOpen(true) }}
                      className="w-full text-left px-3 py-2 text-xs text-ep-secondary hover:text-ep-primary hover:bg-ep-raised transition-colors flex items-center gap-2"
                    >
                      <Pencil size={11} /> Editar
                    </button>
                    <button
                      onClick={() => handleDuplicate(product.id)}
                      disabled={duplicating === product.id}
                      className="w-full text-left px-3 py-2 text-xs text-ep-secondary hover:text-ep-primary hover:bg-ep-raised transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <Copy size={11} /> {duplicating === product.id ? 'Duplicando…' : 'Duplicar'}
                    </button>
                    <button
                      onClick={() => handleArchive(product.id, product.status)}
                      className="w-full text-left px-3 py-2 text-xs text-ep-secondary hover:text-ep-primary hover:bg-ep-raised transition-colors"
                    >
                      {product.status === 'active' ? 'Arquivar' : 'Reativar'}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="w-full text-left px-3 py-2 text-xs text-ep-danger hover:bg-ep-raised transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-ep-secondary text-xs">Preço</span>
                  <span className="text-ep-primary text-sm font-bold">
                    {formatCurrency(product.price, product.currency)}<span className="text-ep-muted font-normal text-xs">/{product.interval}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ep-secondary text-xs">Vendas</span>
                  <span className="text-ep-primary text-sm font-semibold">{product.sales.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ep-secondary text-xs">Receita total</span>
                  <span className="text-ep-accent text-sm font-semibold">{formatCurrency(product.revenue, product.currency)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-ep-border-subtle flex items-center justify-between">
                <span
                  className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border',
                    product.status === 'active'
                      ? 'text-ep-success bg-ep-success/10 border-ep-success/20'
                      : 'text-ep-muted bg-ep-overlay/50 border-ep-border-default'
                  )}
                >
                  {product.status === 'active' ? 'Ativo' : 'Arquivado'}
                </span>
                <div className="flex items-center gap-3">
                  {product.slug && <CopyLinkButton slug={product.slug} />}
                  {product.stripeId && (
                    <a
                      href={`https://dashboard.stripe.com/products/${product.stripeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-ep-muted hover:text-ep-accent text-xs transition-colors"
                    >
                      <ExternalLink size={11} />
                      Stripe
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {modalOpen && (
      <ProductFormModal
        product={editProduct}
        onClose={() => { setModalOpen(false); setEditProduct(null) }}
        onSaved={() => { fetchProducts() }}
      />
    )}
    <ConfirmDialog {...confirmProps} />
    </>
  )
}
