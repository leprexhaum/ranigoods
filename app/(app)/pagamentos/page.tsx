'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import { Search, Download } from 'lucide-react'
import type { Payment, PaymentStatus } from '@/lib/types/payment'
import DateFilter, { getRange } from '@/components/ui/DateFilter'
import type { DatePreset } from '@/components/ui/DateFilter'
import { formatEUR, eurToBrlStr } from '@/lib/utils/currency'

const statusFilters: { label: string; value: PaymentStatus | 'all' }[] = [
  { label: 'Todos',      value: 'all'       },
  { label: 'Aprovados',  value: 'succeeded' },
  { label: 'Falhas',     value: 'failed'    },
  { label: 'Pendentes',  value: 'pending'   },
  { label: 'Reembolsos', value: 'refunded'  },
]

const statusConfig = {
  succeeded: { label: 'Aprovado',  className: 'text-ep-success bg-ep-success/10 border-ep-success/20' },
  failed:    { label: 'Falhou',    className: 'text-ep-danger  bg-ep-danger/10  border-ep-danger/20'  },
  pending:   { label: 'Pendente',  className: 'text-ep-warning bg-ep-warning/10 border-ep-warning/20' },
  refunded:  { label: 'Reembolso', className: 'text-ep-info    bg-ep-info/10    border-ep-info/20'    },
}

const PAGE_SIZE = 12

interface ApiResponse {
  data:  Payment[]
  total: number
  pages: number
  page:  number
}

export default function PagamentosPage() {
  const [activeFilter, setActiveFilter] = useState<PaymentStatus | 'all'>('all')
  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [preset,       setPreset]       = useState<DatePreset>('30d')
  const [customStart,  setCustomStart]  = useState('')
  const [customEnd,    setCustomEnd]    = useState('')
  const [result,       setResult]       = useState<ApiResponse>({ data: [], total: 0, pages: 1, page: 1 })
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
  }, [activeFilter, search, range.start, range.end, page])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const handleDateChange = (p: DatePreset, cs?: string, ce?: string) => {
    setPreset(p); if (cs) setCustomStart(cs); if (ce) setCustomEnd(ce); setPage(1)
  }

  const totalReceita = useMemo(
    () => result.data.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amount, 0),
    [result.data],
  )

  const { data: paginated, total: filteredCount, pages: totalPages } = result

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Pagamentos</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            {loading ? 'Carregando…' : (
              <>
                {filteredCount} transações ·{' '}
                <span className="text-ep-accent">{formatEUR(totalReceita)}</span>
                <span className="text-ep-muted"> (≈ {eurToBrlStr(totalReceita)})</span>
                {' '}aprovado
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateFilter preset={preset} customStart={customStart} customEnd={customEnd} onChange={handleDateChange} compact />
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary text-sm hover:text-ep-primary transition-colors">
            <Download size={13} />
            <span className="hidden sm:inline">Exportar</span> CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1 overflow-x-auto flex-nowrap">
          {statusFilters.map((f) => (
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
            placeholder="Nome, e-mail ou ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 bg-ep-surface border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
          />
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden divide-y divide-ep-border-subtle">
        {loading ? (
          <div className="px-4 py-10 text-center text-ep-muted text-sm">Carregando…</div>
        ) : paginated.length === 0 ? (
          <div className="px-4 py-10 text-center text-ep-muted text-sm">Nenhum pagamento no período</div>
        ) : paginated.map((p) => {
          const s = statusConfig[p.status]
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

      {/* Desktop: tabela */}
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
                const s = statusConfig[p.status]
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

      {/* Paginação mobile */}
      {totalPages > 1 && (
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
    </div>
  )
}
