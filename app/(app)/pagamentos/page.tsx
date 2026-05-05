'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import { Search, Download, ShoppingCart, CreditCard } from 'lucide-react'
import type { Payment, PaymentStatus } from '@/lib/types/payment'
import DateFilter, { getRange } from '@/components/ui/DateFilter'
import type { DatePreset } from '@/components/ui/DateFilter'
import { formatEUR, eurToBrlStr, formatCurrency } from '@/lib/utils/currency'

const statusFilters: { label: string; value: PaymentStatus | 'all' }[] = [
  { label: 'Todos',        value: 'all'        },
  { label: 'Aprovados',    value: 'succeeded'  },
  { label: 'Falhas',       value: 'failed'     },
  { label: 'Pendentes',    value: 'pending'    },
  { label: 'Processando',  value: 'processing' },
  { label: 'Reembolsos',   value: 'refunded'   },
  { label: 'Disputados',   value: 'disputed'   },
]

const orderStatusFilters = [
  { label: 'Todos',     value: 'all'     },
  { label: 'Pagos',     value: 'paid'    },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Falhas',    value: 'failed'  },
]

const statusConfig: Record<string, { label: string; className: string }> = {
  succeeded:  { label: 'Aprovado',     className: 'text-ep-success bg-ep-success/10 border-ep-success/20' },
  failed:     { label: 'Falhou',       className: 'text-ep-danger  bg-ep-danger/10  border-ep-danger/20'  },
  pending:    { label: 'Pendente',     className: 'text-ep-warning bg-ep-warning/10 border-ep-warning/20' },
  processing: { label: 'Processando',  className: 'text-ep-info    bg-ep-info/10    border-ep-info/20'    },
  refunded:   { label: 'Reembolso',    className: 'text-ep-info    bg-ep-info/10    border-ep-info/20'    },
  disputed:   { label: 'Disputado',    className: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  paid:       { label: 'Pago',         className: 'text-ep-success bg-ep-success/10 border-ep-success/20' },
}

const PAGE_SIZE = 12

interface ApiResponse {
  data:  Payment[]
  total: number
  pages: number
  page:  number
}

interface OrderItem { id: string; name: string; quantity: number; unitPrice: number }
interface Order {
  id: string; status: string; amount: number; currency: string;
  customerName: string; customerEmail: string; paymentMethod: string;
  createdAt: string; items: OrderItem[]
}
interface OrdersResponse { data: Order[]; total: number; pages: number; page: number }

export default function PagamentosPage() {
  const [source,       setSource]       = useState<'checkout' | 'cart'>('checkout')
  const [activeFilter, setActiveFilter] = useState<PaymentStatus | 'all'>('all')
  const [orderFilter,  setOrderFilter]  = useState('all')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [preset,       setPreset]       = useState<DatePreset>('30d')
  const [customStart,  setCustomStart]  = useState('')
  const [customEnd,    setCustomEnd]    = useState('')
  const [result,       setResult]       = useState<ApiResponse>({ data: [], total: 0, pages: 1, page: 1 })
  const [orders,       setOrders]       = useState<OrdersResponse>({ data: [], total: 0, pages: 1, page: 1 })
  const [loading,      setLoading]      = useState(true)

  const range = getRange(preset, customStart, customEnd)

  const handleExport = () => {
    const params = new URLSearchParams({
      status: activeFilter,
      start:  range.start,
      end:    range.end,
    })
    if (search) params.set('search', search)
    window.open(`/api/payments/export?${params}`, '_blank')
  }

  const fetchPayments = useCallback(async () => {
    if (source !== 'checkout') return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: activeFilter,
        start:  range.start,
        end:    range.end,
        page:   String(page),
        limit:  String(PAGE_SIZE),
      })
      if (search) params.set('search', search)
      const res  = await fetch(`/api/payments?${params}`)
      const json = await res.json() as ApiResponse
      setResult(json)
    } finally {
      setLoading(false)
    }
  }, [source, activeFilter, search, range.start, range.end, page])

  const fetchOrders = useCallback(async () => {
    if (source !== 'cart') return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: orderFilter,
        start:  range.start,
        end:    range.end,
        page:   String(page),
        limit:  String(PAGE_SIZE),
      })
      if (search) params.set('search', search)
      const res  = await fetch(`/api/orders?${params}`)
      const json = await res.json() as OrdersResponse
      setOrders(json)
    } finally {
      setLoading(false)
    }
  }, [source, orderFilter, search, range.start, range.end, page])

  useEffect(() => { fetchPayments() }, [fetchPayments])
  useEffect(() => { fetchOrders()   }, [fetchOrders])

  const handleDateChange = (p: DatePreset, cs?: string, ce?: string) => {
    setPreset(p); if (cs) setCustomStart(cs); if (ce) setCustomEnd(ce); setPage(1)
  }

  const handleSourceChange = (s: 'checkout' | 'cart') => {
    setSource(s); setPage(1); setSearch(''); setActiveFilter('all'); setOrderFilter('all')
  }

  const totalReceita = useMemo(
    () => result.data.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0),
    [result.data],
  )

  const totalOrders = useMemo(
    () => orders.data.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount, 0),
    [orders.data],
  )

  const { data: paginated, total: filteredCount, pages: totalPages } = result
  const { data: orderData, total: orderTotal, pages: orderPages }    = orders

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Pagamentos</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            {loading ? 'Carregando…' : source === 'checkout' ? (
              <>
                {filteredCount} transações ·{' '}
                <span className="text-ep-accent">{formatEUR(totalReceita)}</span>
                <span className="text-ep-muted"> (≈ {eurToBrlStr(totalReceita)})</span>
                {' '}aprovado
              </>
            ) : (
              <>
                {orderTotal} pedidos ·{' '}
                <span className="text-ep-accent">{formatCurrency(totalOrders, orders.data[0]?.currency ?? 'EUR')}</span>
                {' '}pago
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateFilter preset={preset} customStart={customStart} customEnd={customEnd} onChange={handleDateChange} compact />
          {source === 'checkout' && (
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary text-sm hover:text-ep-primary transition-colors">
              <Download size={13} />
              <span className="hidden sm:inline">Exportar</span> CSV
            </button>
          )}
        </div>
      </div>

      {/* Toggle Checkout / Carrinho */}
      <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1 w-fit">
        <button
          onClick={() => handleSourceChange('checkout')}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all', source === 'checkout' ? 'bg-ep-accent text-ep-base' : 'text-ep-secondary hover:text-ep-primary')}
        >
          <CreditCard size={12} /> Checkout
        </button>
        <button
          onClick={() => handleSourceChange('cart')}
          className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all', source === 'cart' ? 'bg-ep-accent text-ep-base' : 'text-ep-secondary hover:text-ep-primary')}
        >
          <ShoppingCart size={12} /> Carrinho API
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1 overflow-x-auto flex-nowrap">
          {(source === 'checkout' ? statusFilters : orderStatusFilters).map((f) => (
            <button
              key={f.value}
              onClick={() => { source === 'checkout' ? setActiveFilter(f.value as PaymentStatus | 'all') : setOrderFilter(f.value); setPage(1) }}
              className={clsx(
                'px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap',
                (source === 'checkout' ? activeFilter : orderFilter) === f.value
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
            placeholder="Nome, e-mail ou ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 bg-ep-surface border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
          />
        </div>
      </div>

      {/* Mobile: cards — Checkout */}
      {source === 'checkout' && (
      <div className="md:hidden bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden divide-y divide-ep-border-subtle">
        {loading ? (
          <div className="px-4 py-10 text-center text-ep-muted text-sm">Carregando…</div>
        ) : paginated.length === 0 ? (
          <div className="px-4 py-10 text-center text-ep-muted text-sm">Nenhum pagamento no período</div>
        ) : paginated.map((p) => {
          const s = statusConfig[p.status] ?? statusConfig.pending
          return (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-ep-primary text-sm font-medium truncate">{p.customer}</p>
                  <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium border flex-shrink-0', s.className)}>
                    {s.label}
                  </span>
                </div>
                <p className="text-ep-muted text-xs truncate">{p.product} · {p.method}</p>
                <p className="text-ep-muted text-xs">{new Date(p.date + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-ep-primary text-sm font-bold">{formatEUR(p.amount)}</p>
                <p className="text-ep-muted text-xs">≈ {eurToBrlStr(p.amount)}</p>
              </div>
            </div>
          )
        })}
      </div>
      )} {/* end source === checkout mobile */}

      {/* Desktop: tabela — Checkout */}
      {source === 'checkout' && (
      <div className="hidden md:block bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ep-border-subtle">
                {['ID', 'Cliente', 'Produto', 'Método', 'Valor (EUR / BRL)', 'Status', 'Data'].map((h) => (
                  <th key={h} className="text-left text-ep-muted text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-ep-muted text-sm">Carregando…</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-ep-muted text-sm">Nenhum pagamento no período selecionado</td></tr>
              ) : paginated.map((p) => {
                const s = statusConfig[p.status] ?? statusConfig.pending
                return (
                  <tr key={p.id} className="border-b border-ep-border-subtle last:border-0 hover:bg-ep-raised/50 transition-colors">
                    <td className="px-5 py-3"><span className="text-ep-muted text-xs font-mono">{p.id.slice(0, 14)}…</span></td>
                    <td className="px-5 py-3">
                      <p className="text-ep-primary text-sm font-medium whitespace-nowrap">{p.customer}</p>
                      <p className="text-ep-muted text-xs">{p.email}</p>
                    </td>
                    <td className="px-5 py-3"><span className="text-ep-secondary text-sm whitespace-nowrap">{p.product}</span></td>
                    <td className="px-5 py-3"><span className="text-ep-secondary text-sm">{p.method}</span></td>
                    <td className="px-5 py-3">
                      <p className="text-ep-primary text-sm font-semibold whitespace-nowrap">{formatEUR(p.amount)}</p>
                      <p className="text-ep-muted text-xs">≈ {eurToBrlStr(p.amount)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border', s.className)}>{s.label}</span>
                    </td>
                    <td className="px-5 py-3"><span className="text-ep-secondary text-xs whitespace-nowrap">{new Date(p.date + 'T00:00:00').toLocaleDateString('pt-PT')}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-ep-border-subtle">
            <span className="text-ep-muted text-xs">Página {page} de {totalPages} · {filteredCount} resultados</span>
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
      )} {/* end source === checkout desktop */}

      {/* Paginação mobile — Checkout */}
      {source === 'checkout' && totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between">
          <span className="text-ep-muted text-xs">Página {page} de {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded text-xs text-ep-secondary border border-ep-border-default hover:border-ep-accent hover:text-ep-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              ← Ant.
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded text-xs text-ep-secondary border border-ep-border-default hover:border-ep-accent hover:text-ep-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Próx. →
            </button>
          </div>
        </div>
      )}

      {/* Tabela de Orders (Carrinho API) */}
      {source === 'cart' && (
        <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ep-border-subtle">
                  {['ID', 'Cliente', 'Produtos', 'Valor', 'Status', 'Data'].map(h => (
                    <th key={h} className="text-left text-ep-muted text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-ep-muted text-sm">Carregando…</td></tr>
                ) : orderData.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-ep-muted text-sm">Nenhum pedido no período</td></tr>
                ) : orderData.map(o => {
                  const s = statusConfig[o.status] ?? statusConfig.pending
                  return (
                    <tr key={o.id} className="border-b border-ep-border-subtle last:border-0 hover:bg-ep-raised/50 transition-colors">
                      <td className="px-5 py-3"><span className="text-ep-muted text-xs font-mono">{o.id.slice(0, 14)}…</span></td>
                      <td className="px-5 py-3">
                        <p className="text-ep-primary text-sm font-medium whitespace-nowrap">{o.customerName}</p>
                        <p className="text-ep-muted text-xs">{o.customerEmail}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-0.5">
                          {o.items.map(i => (
                            <p key={i.id} className="text-ep-secondary text-xs whitespace-nowrap">{i.name} × {i.quantity}</p>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-ep-primary text-sm font-semibold whitespace-nowrap">{formatCurrency(o.amount, o.currency)}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border', s.className)}>{s.label}</span>
                      </td>
                      <td className="px-5 py-3"><span className="text-ep-secondary text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString('pt-PT')}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {orderPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-ep-border-subtle">
              <span className="text-ep-muted text-xs">Página {page} de {orderPages} · {orderTotal} resultados</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 rounded text-xs text-ep-secondary border border-ep-border-default hover:border-ep-accent hover:text-ep-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Anterior
                </button>
                <button onClick={() => setPage(p => Math.min(orderPages, p + 1))} disabled={page === orderPages}
                  className="px-3 py-1 rounded text-xs text-ep-secondary border border-ep-border-default hover:border-ep-accent hover:text-ep-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
