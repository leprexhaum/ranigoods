'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ShoppingCart } from 'lucide-react'
import clsx from 'clsx'

interface AbandonedCart {
  id:                    string
  productId:             string
  stripePaymentIntentId: string
  customerName:          string
  customerEmail:         string
  customerPhone:         string
  amount:                number
  currency:              string
  status:                string
  recoveredAt:           string | null
  expiresAt:             string
  createdAt:             string
}

interface ApiResponse {
  data:  AbandonedCart[]
  total: number
  pages: number
  page:  number
}

const STATUS_FILTERS = [
  { label: 'Todos',       value: 'all'       },
  { label: 'Pendentes',   value: 'pending'   },
  { label: 'Abandonados', value: 'abandoned' },
  { label: 'Recuperados', value: 'recovered' },
]

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pendente',   className: 'text-ep-warning bg-ep-warning/10 border-ep-warning/20' },
  abandoned: { label: 'Abandonado', className: 'text-ep-danger  bg-ep-danger/10  border-ep-danger/20'  },
  recovered: { label: 'Recuperado', className: 'text-ep-success bg-ep-success/10 border-ep-success/20' },
}

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

const PAGE_SIZE = 20

export default function CarrinhosAbandonadosPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [result,       setResult]       = useState<ApiResponse>({ data: [], total: 0, pages: 1, page: 1 })
  const [loading,      setLoading]      = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (activeFilter !== 'all') params.set('status', activeFilter)
      if (search) params.set('search', search)
      const res  = await fetch(`/api/abandoned-carts?${params}`)
      const json = await res.json() as ApiResponse
      setResult(json)
    } finally {
      setLoading(false)
    }
  }, [activeFilter, search, page])

  useEffect(() => { fetchData() }, [fetchData])

  const { data, total, pages: totalPages } = result

  const recoveredCount  = data.filter(c => c.status === 'recovered').length
  const abandonedCount  = data.filter(c => c.status === 'abandoned').length
  const recoveryRate    = total > 0 ? Math.round((recoveredCount / total) * 100) : 0

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-ep-primary text-lg md:text-xl font-bold">Carrinhos Abandonados</h1>
        <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
          {loading ? 'Carregando…' : `${total} carrinhos · taxa de recuperação ${recoveryRate}%`}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1 overflow-x-auto flex-nowrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setActiveFilter(f.value); setPage(1) }}
              className={clsx(
                'px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap',
                activeFilter === f.value
                  ? 'bg-ep-accent text-ep-base font-semibold'
                  : 'text-ep-secondary hover:text-ep-primary',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted" />
          <input
            type="text"
            placeholder="Email ou nome…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 bg-ep-surface border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
          />
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden divide-y divide-ep-border-subtle">
        {loading ? (
          <div className="px-4 py-10 text-center text-ep-muted text-sm">Carregando…</div>
        ) : data.length === 0 ? (
          <div className="px-4 py-10 flex flex-col items-center gap-3">
            <ShoppingCart size={24} className="text-ep-muted" />
            <p className="text-ep-muted text-sm">Nenhum carrinho encontrado</p>
          </div>
        ) : data.map(c => {
          const s = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending
          return (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-ep-primary text-sm font-medium truncate">{c.customerName || c.customerEmail || 'Anónimo'}</p>
                  <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium border flex-shrink-0', s.className)}>
                    {s.label}
                  </span>
                </div>
                <p className="text-ep-muted text-xs truncate">{c.customerEmail}</p>
                <p className="text-ep-muted text-xs">{new Date(c.createdAt).toLocaleDateString('pt-PT')}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-ep-primary text-sm font-bold">{fmt(c.amount, c.currency)}</p>
                {c.recoveredAt && (
                  <p className="text-ep-success text-xs">Recuperado</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ep-border-subtle">
                {['Cliente', 'Email', 'Valor', 'Status', 'Criado em', 'Expira em'].map(h => (
                  <th key={h} className="text-left text-ep-muted text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-ep-muted text-sm">Carregando…</td></tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingCart size={24} className="text-ep-muted" />
                      <p className="text-ep-muted text-sm">Nenhum carrinho encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : data.map(c => {
                const s = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending
                return (
                  <tr key={c.id} className="border-b border-ep-border-subtle last:border-0 hover:bg-ep-raised/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-ep-primary text-sm font-medium whitespace-nowrap">{c.customerName || '—'}</p>
                      {c.customerPhone && <p className="text-ep-muted text-xs">{c.customerPhone}</p>}
                    </td>
                    <td className="px-5 py-3"><span className="text-ep-secondary text-sm">{c.customerEmail || '—'}</span></td>
                    <td className="px-5 py-3"><span className="text-ep-primary text-sm font-semibold tabular-nums">{fmt(c.amount, c.currency)}</span></td>
                    <td className="px-5 py-3">
                      <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border', s.className)}>{s.label}</span>
                    </td>
                    <td className="px-5 py-3"><span className="text-ep-secondary text-xs whitespace-nowrap">{new Date(c.createdAt).toLocaleString('pt-PT')}</span></td>
                    <td className="px-5 py-3"><span className="text-ep-secondary text-xs whitespace-nowrap">{new Date(c.expiresAt).toLocaleString('pt-PT')}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-ep-border-subtle">
            <span className="text-ep-muted text-xs">Página {page} de {totalPages} · {total} resultados</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded text-xs text-ep-secondary border border-ep-border-default hover:border-ep-accent hover:text-ep-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Anterior
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 rounded text-xs text-ep-secondary border border-ep-border-default hover:border-ep-accent hover:text-ep-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
