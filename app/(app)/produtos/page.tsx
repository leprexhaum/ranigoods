'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, ExternalLink, MoreVertical, Check, Pencil, Copy, Globe, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import type { Product } from '@/lib/services/product.service'
import type { PixelConfig } from '@/lib/types/pixel'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import { PlatformIcon, PLATFORM_CONFIG, type Platform } from '@/components/pixels/PlatformIcon'

const DEFAULT_HOST = process.env.NEXT_PUBLIC_APP_HOST ?? 'techpags.shop'

function formatCurrency(cents: number, currency = 'EUR') {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(cents / 100)
}

function buildCheckoutUrl(slug: string, activeDomain?: string) {
  const defaultUrl = `https://${DEFAULT_HOST}/checkout/${slug}`
  const customUrl  = activeDomain ? `https://${activeDomain}/checkout/${slug}` : null
  return { defaultUrl, customUrl }
}

function DomainPicker({
  slug,
  activeDomain,
  mode,
}: {
  slug: string
  activeDomain: string
  mode: 'copy' | 'open'
}) {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { defaultUrl, customUrl } = buildCheckoutUrl(slug, activeDomain)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (url: string) => {
    setOpen(false)
    if (mode === 'copy') {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-0.5 text-ep-muted hover:text-ep-accent transition-colors"
        title={mode === 'copy' ? 'Copiar link do checkout' : 'Abrir checkout'}
      >
        {mode === 'copy'
          ? (copied ? <Check size={13} className="text-ep-success" /> : <Copy size={13} />)
          : <ExternalLink size={13} />
        }
        <ChevronDown size={10} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 bottom-6 z-20 bg-ep-surface border border-ep-border-default rounded-md shadow-lg min-w-[200px] py-1">
          <p className="px-3 py-1.5 text-ep-muted text-[10px] uppercase tracking-wider font-medium border-b border-ep-border-subtle mb-1">
            {mode === 'copy' ? 'Copiar link' : 'Abrir checkout'}
          </p>
          <button
            onClick={() => handleSelect(customUrl!)}
            className="w-full text-left px-3 py-2 text-xs text-ep-secondary hover:text-ep-primary hover:bg-ep-raised transition-colors flex items-center gap-2"
          >
            <Globe size={11} className="text-ep-accent flex-shrink-0" />
            <span className="truncate">{activeDomain}</span>
          </button>
          <button
            onClick={() => handleSelect(defaultUrl)}
            className="w-full text-left px-3 py-2 text-xs text-ep-secondary hover:text-ep-primary hover:bg-ep-raised transition-colors flex items-center gap-2"
          >
            <Globe size={11} className="flex-shrink-0" />
            <span className="truncate">{DEFAULT_HOST}</span>
          </button>
        </div>
      )}
    </div>
  )
}

function CopyLinkButton({ slug, activeDomain }: { slug: string; activeDomain?: string }) {
  const [copied, setCopied] = useState(false)
  const { defaultUrl } = buildCheckoutUrl(slug)

  if (activeDomain) {
    return <DomainPicker slug={slug} activeDomain={activeDomain} mode="copy" />
  }

  const copy = () => {
    navigator.clipboard.writeText(defaultUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="text-ep-muted hover:text-ep-accent transition-colors"
      title="Copiar link do checkout"
    >
      {copied ? <Check size={13} className="text-ep-success" /> : <Copy size={13} />}
    </button>
  )
}

function OpenLinkButton({ slug, activeDomain }: { slug: string; activeDomain?: string }) {
  const { defaultUrl } = buildCheckoutUrl(slug)

  if (activeDomain) {
    return <DomainPicker slug={slug} activeDomain={activeDomain} mode="open" />
  }

  return (
    <a
      href={defaultUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ep-muted hover:text-ep-accent transition-colors"
      title="Abrir checkout"
    >
      <ExternalLink size={13} />
    </a>
  )
}

export default function ProdutosPage() {
  const router = useRouter()
  const [filter,      setFilter]      = useState<'all' | 'active' | 'archived'>('all')
  const [products,    setProducts]    = useState<Product[]>([])
  const [pixels,      setPixels]      = useState<PixelConfig[]>([])
  const [activeDomain, setActiveDomain] = useState<string | undefined>(undefined)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const { confirmProps, confirm }     = useConfirm()

  useEffect(() => {
    fetch('/api/pixels')
      .then(r => r.json())
      .then((data: PixelConfig[]) => setPixels(data))
      .catch(() => {})
    fetch('/api/domains')
      .then(r => r.json())
      .then((data: { domain: string; status: string }[]) => {
        const active = Array.isArray(data) ? data.find(d => d.status === 'active') : undefined
        setActiveDomain(active?.domain)
      })
      .catch(() => {})
  }, [])

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
            onClick={() => router.push('/produtos/novo')}
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
                      onClick={() => router.push(`/produtos/${product.id}/editar`)}
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
                <div className="flex items-center justify-between">
                  <span className="text-ep-secondary text-xs">Estoque</span>
                  <span className="text-ep-primary text-sm font-semibold">
                    {product.stock === -1 ? <span className="text-ep-muted text-xs">Ilimitado</span> : product.stock.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ep-secondary text-xs">Template</span>
                  <span className="text-ep-muted text-xs font-mono">{product.checkoutTemplate}</span>
                </div>
              </div>

              {/* Pixels vinculados */}
              {(() => {
                const ids = (product.pixelIds ?? []) as string[]
                const linked = pixels.filter(px => ids.includes(px.id))
                if (linked.length === 0) return null
                return (
                  <div className="mt-3 pt-3 border-t border-ep-border-subtle">
                    <p className="text-ep-muted text-xs mb-2">Pixels</p>
                    <div className="flex flex-wrap gap-1.5">
                      {linked.map(px => {
                        const cfg = PLATFORM_CONFIG[px.platform as Platform]
                        return (
                          <div
                            key={px.id}
                            title={`${px.name || cfg?.label} — ${cfg?.label}`}
                            className={clsx(
                              'flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs',
                              px.enabled
                                ? `${cfg?.bg ?? 'bg-ep-accent/10'} ${cfg?.border ?? 'border-ep-accent/20'} text-ep-primary`
                                : 'bg-ep-overlay/30 border-ep-border-subtle text-ep-muted opacity-60',
                            )}
                          >
                            <PlatformIcon platform={px.platform as Platform} size={11} />
                            <span className="truncate max-w-[80px]">{px.name || cfg?.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

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
                  {product.slug && (
                    <div className="flex items-center gap-1.5">
                      <CopyLinkButton slug={product.slug} activeDomain={activeDomain} />
                      <OpenLinkButton slug={product.slug} activeDomain={activeDomain} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    <ConfirmDialog {...confirmProps} />
    </>
  )
}
