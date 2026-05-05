'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShoppingBag, Search, ChevronLeft, ChevronRight, Package, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { TableSkeleton } from '@/components/ui/Skeleton'
import DateFilter, { getRange, type DatePreset } from '@/components/ui/DateFilter'

interface OrderItem {
  id:        string
  productId: string
  name:      string
  quantity:  number
  unitPrice: number
}

interface Order {
  id:                    string
  cartId:                string
  userId:                string
  status:                string
  amount:                number
  currency:              string
  stripeSessionId:       string | null
  stripePaymentIntentId: string | null
  customerName:          string
  customerEmail:         string
  customerPhone:         string
  paymentMethod:         string
  createdAt:             string
  items:                 OrderItem[]
}

interface OrdersResponse {
  data:  Order[]
  total: number
  page:  number
  pages: number
}

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid:       { label: 'Pago',        cls: 'bg-ep-success/10 border-ep-success/20 text-ep-success' },
    pending:    { label: 'Pendente',    cls: 'bg-ep-warning/10 border-ep-warning/20 text-ep-warning' },
    failed:     { label: 'Falhou',      cls: 'bg-ep-danger/10  border-ep-danger/20  text-ep-danger'  },
    refunded:   { label: 'Reembolsado', cls: 'bg-ep-muted/10   border-ep-border-default text-ep-muted' },
    processing: { label: 'Processando', cls: 'bg-blue-500/10   border-blue-500/20   text-blue-400'   },
  }
  const s = map[status] ?? { label: status, cls: 'bg-ep-raised border-ep-border-default text-ep-muted' }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border', s.cls)}>
      {s.label}
    </span>
  )
}

function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-ep-surface border-l border-ep-border-default w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ep-border-subtle">
          <h2 className="text-ep-primary font-semibold text-sm">Detalhes do pedido</h2>
          <button onClick={onClose} className="text-ep-muted hover:text-ep-primary text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Status + valor */}
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <span className="text-ep-primary font-bold text-lg">{fmt(order.amount, order.currency)}</span>
          </div>

          {/* Cliente */}
          <div className="bg-ep-raised border border-ep-border-default rounded-lg p-4 space-y-2">
            <p className="text-ep-muted text-xs font-medium uppercase tracking-wide">Cliente</p>
            <p className="text-ep-primary text-sm font-medium">{order.customerName || '—'}</p>
            <p className="text-ep-secondary text-xs">{order.customerEmail || '—'}</p>
            {order.customerPhone && <p className="text-ep-secondary text-xs">{order.customerPhone}</p>}
          </div>

          {/* Itens */}
          <div className="space-y-2">
            <p className="text-ep-muted text-xs font-medium uppercase tracking-wide">Itens do pedido</p>
            <div className="bg-ep-raised border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-ep-surface border border-ep-border-default flex items-center justify-center flex-shrink-0">
                      <Package size={12} className="text-ep-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-ep-primary text-xs font-medium truncate">{item.name}</p>
                      <p className="text-ep-muted text-xs">x{item.quantity}</p>
                    </div>
                  </div>
                  <span className="text-ep-primary text-xs font-medium whitespace-nowrap">
                    {fmt(item.unitPrice * item.quantity, order.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pagamento */}
          <div className="bg-ep-raised border border-ep-border-default rounded-lg p-4 space-y-2">
            <p className="text-ep-muted text-xs font-medium uppercase tracking-wide">Pagamento</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-ep-secondary">Método</span>
                <span className="text-ep-primary">{order.paymentMethod || '—'}</span>
              </div>
              {order.stripeSessionId && (
                <div className="flex justify-between gap-2">
                  <span className="text-ep-secondary">Session ID</span>
                  <span className="text-ep-muted font-mono truncate max-w-[180px]">{order.stripeSessionId}</span>
                </div>
              )}
              {order.stripePaymentIntentId && (
                <div className="flex justify-between gap-2">
                  <span className="text-ep-secondary">Payment Intent</span>
                  <span className="text-ep-muted font-mono truncate max-w-[180px]">{order.stripePaymentIntentId}</span>
                </div>
              )}
            </div>
          </div>

          {/* IDs */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-ep-muted">Order ID</span>
              <span className="text-ep-secondary font-mono truncate">{order.id}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-ep-muted">Cart ID</span>
              <span className="text-ep-secondary font-mono truncate">{order.cartId}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-ep-muted">Data</span>
              <span className="text-ep-secondary">{new Date(order.createdAt).toLocaleString('pt-PT')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [orders,      setOrders]      = useState<Order[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [status,      setStatus]      = useState('all')
  const [preset,      setPreset]      = useState<DatePreset>('max')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [page,        setPage]        = useState(1)
  const [pages,       setPages]       = useState(1)
  const [total,       setTotal]       = useState(0)
  const [selected,    setSelected]    = useState<Order | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const range = getRange(preset, customStart, customEnd)
    const sp = new URLSearchParams({ page: String(page), limit: '12', status })
    if (search) sp.set('search', search)
    if (preset !== 'max') {
      sp.set('start', range.start)
      sp.set('end', range.end)
    }
    const res  = await fetch(`/api/orders?${sp}`)
    const data = await res.json() as OrdersResponse
    setOrders(data.data ?? [])
    setTotal(data.total ?? 0)
    setPages(data.pages ?? 1)
    setLoading(false)
  }, [page, status, search, preset, customStart, customEnd])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const STATUSES = [
    { id: 'all',        label: 'Todos'       },
    { id: 'paid',       label: 'Pagos'       },
    { id: 'pending',    label: 'Pendentes'   },
    { id: 'failed',     label: 'Falhados'    },
    { id: 'refunded',   label: 'Reembolsados'},
  ]

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Pedidos</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            Pedidos gerados via carrinho multi-produto
          </p>
        </div>
        {total > 0 && (
          <span className="text-ep-muted text-xs">{total} pedido{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nome, e-mail ou ID…"
            className="w-full pl-9 pr-3 py-2 bg-ep-surface border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent"
          />
        </div>
        <DateFilter
          preset={preset}
          customStart={customStart}
          customEnd={customEnd}
          onChange={(p, cs, ce) => { setPreset(p); setCustomStart(cs ?? ''); setCustomEnd(ce ?? ''); setPage(1) }}
        />
      </div>

      {/* Tabs de status */}
      <div className="overflow-x-auto pb-px">
        <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1 w-fit">
          {STATUSES.map(s => (
            <button
              key={s.id}
              onClick={() => { setStatus(s.id); setPage(1) }}
              className={clsx(
                'px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap',
                status === s.id ? 'bg-ep-accent text-ep-base font-semibold' : 'text-ep-secondary hover:text-ep-primary',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody><TableSkeleton rows={6} cols={6} widths={['120px','140px','120px','80px','80px','60px']} /></tbody>
            </table>
          </div>
        ) : orders.length === 0 ? (
          <div className="px-5 py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-ep-raised border border-ep-border-default flex items-center justify-center mx-auto">
              <ShoppingBag size={20} className="text-ep-muted" />
            </div>
            <p className="text-ep-primary font-medium text-sm">Nenhum pedido encontrado</p>
            <p className="text-ep-muted text-xs">Os pedidos aparecem aqui após pagamentos via carrinho</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ep-border-subtle">
                  {['ID', 'Cliente', 'Itens', 'Valor', 'Status', 'Data', ''].map(h => (
                    <th key={h} className="text-left text-ep-muted text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-ep-border-subtle last:border-0 hover:bg-ep-raised/40 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-ep-muted text-xs font-mono">{o.id.slice(0, 12)}…</span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-ep-primary text-sm">{o.customerName || '—'}</p>
                      <p className="text-ep-muted text-xs">{o.customerEmail}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Package size={12} className="text-ep-muted" />
                        <span className="text-ep-secondary text-sm">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-ep-primary text-sm font-medium">{fmt(o.amount, o.currency)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-ep-secondary text-xs whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleDateString('pt-PT')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setSelected(o)}
                        className="p-1.5 rounded hover:bg-ep-raised text-ep-muted hover:text-ep-accent transition-colors"
                        title="Ver detalhes"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-ep-muted text-xs">Página {page} de {pages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-ep-border-default text-ep-secondary hover:text-ep-primary disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-1.5 rounded border border-ep-border-default text-ep-secondary hover:text-ep-primary disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
