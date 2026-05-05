'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronDown, ChevronRight, CheckCircle2, XCircle, Zap } from 'lucide-react'
import clsx from 'clsx'

interface StripeEventRow {
  id:         string
  type:       string
  livemode:   boolean
  objectId:   string
  objectType: string
  processed:  boolean
  error:      string | null
  receivedAt: string
}

interface StripeEventFull extends StripeEventRow {
  payload: unknown
}

interface ApiResponse {
  data:  StripeEventRow[]
  total: number
  pages: number
  page:  number
}

const PAGE_SIZE = 30

export default function StripeEventosPage() {
  const [typeFilter,  setTypeFilter]  = useState('')
  const [processed,   setProcessed]   = useState('all')
  const [page,        setPage]        = useState(1)
  const [result,      setResult]      = useState<ApiResponse>({ data: [], total: 0, pages: 1, page: 1 })
  const [loading,     setLoading]     = useState(true)
  const [expanded,    setExpanded]    = useState<Record<string, StripeEventFull | null>>({})
  const [loadingId,   setLoadingId]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      if (typeFilter)          params.set('type',      typeFilter)
      if (processed !== 'all') params.set('processed', processed)
      const res  = await fetch(`/api/stripe-events?${params}`)
      const json = await res.json() as ApiResponse
      setResult(json)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, processed, page])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleExpand = async (id: string) => {
    if (id in expanded) {
      setExpanded(e => { const n = { ...e }; delete n[id]; return n })
      return
    }
    setLoadingId(id)
    try {
      const res  = await fetch(`/api/stripe-events/${id}`)
      const data = await res.json() as StripeEventFull
      setExpanded(e => ({ ...e, [id]: data }))
    } finally {
      setLoadingId(null)
    }
  }

  const { data, total, pages: totalPages } = result

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-ep-primary text-lg md:text-xl font-bold">Eventos Stripe</h1>
        <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
          {loading ? 'Carregando…' : `${total} eventos recebidos`}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1">
          {[
            { label: 'Todos',        value: 'all'   },
            { label: 'Processados',  value: 'true'  },
            { label: 'Com erro',     value: 'false' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => { setProcessed(f.value); setPage(1) }}
              className={clsx(
                'px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap',
                processed === f.value
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
            placeholder="Tipo de evento (ex: payment_intent)"
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 bg-ep-surface border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ep-border-subtle">
                <th className="w-8 px-3 py-3" />
                {['Tipo', 'Object ID', 'Modo', 'Status', 'Recebido em'].map(h => (
                  <th key={h} className="text-left text-ep-muted text-xs font-medium px-4 py-3 whitespace-nowrap">{h}</th>
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
                      <Zap size={24} className="text-ep-muted" />
                      <p className="text-ep-muted text-sm">Nenhum evento encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : data.map(ev => (
                <>
                  <tr
                    key={ev.id}
                    className="border-b border-ep-border-subtle last:border-0 hover:bg-ep-raised/50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(ev.id)}
                  >
                    <td className="px-3 py-3 text-ep-muted">
                      {loadingId === ev.id
                        ? <span className="inline-block w-3 h-3 border border-ep-muted border-t-transparent rounded-full animate-spin" />
                        : ev.id in expanded
                          ? <ChevronDown size={13} />
                          : <ChevronRight size={13} />
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-ep-primary text-xs font-mono">{ev.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-ep-muted text-xs font-mono">{ev.objectId || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium border',
                        ev.livemode
                          ? 'text-ep-success bg-ep-success/10 border-ep-success/20'
                          : 'text-ep-warning bg-ep-warning/10 border-ep-warning/20',
                      )}>
                        {ev.livemode ? 'Live' : 'Test'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ev.processed
                        ? <span className="flex items-center gap-1 text-ep-success text-xs"><CheckCircle2 size={12} /> OK</span>
                        : <span className="flex items-center gap-1 text-ep-danger text-xs"><XCircle size={12} /> {ev.error ? 'Erro' : 'Pendente'}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-ep-secondary text-xs whitespace-nowrap">{new Date(ev.receivedAt).toLocaleString('pt-PT')}</span>
                    </td>
                  </tr>
                  {ev.id in expanded && expanded[ev.id] && (
                    <tr key={`${ev.id}-expanded`} className="border-b border-ep-border-subtle bg-ep-raised/30">
                      <td colSpan={6} className="px-5 py-4">
                        {ev.error && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs font-mono">
                            Erro: {ev.error}
                          </div>
                        )}
                        <p className="text-ep-muted text-xs mb-2 font-medium uppercase tracking-wide">Payload</p>
                        <pre className="text-xs text-ep-secondary bg-ep-surface border border-ep-border-subtle rounded p-3 overflow-x-auto max-h-96 font-mono leading-relaxed">
                          {JSON.stringify(expanded[ev.id]?.payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-ep-border-subtle">
            <span className="text-ep-muted text-xs">Página {page} de {totalPages} · {total} eventos</span>
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
