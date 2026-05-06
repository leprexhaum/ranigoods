'use client'

import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { Banknote } from 'lucide-react'
import { formatEUR } from '@/lib/utils/currency'
import { TableSkeleton } from '@/components/ui/Skeleton'

interface Payout {
  id:          string
  amount:      number
  currency:    string
  status:      string
  arrivalDate: string
  description: string
  createdAt:   string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  paid:        { label: 'Pago',       className: 'text-ep-success bg-ep-success/10 border-ep-success/20' },
  pending:     { label: 'Pendente',   className: 'text-ep-warning bg-ep-warning/10 border-ep-warning/20' },
  in_transit:  { label: 'Em trânsito', className: 'text-ep-info bg-ep-info/10 border-ep-info/20' },
  failed:      { label: 'Falhou',     className: 'text-ep-danger bg-ep-danger/10 border-ep-danger/20'   },
  canceled:    { label: 'Cancelado',  className: 'text-ep-muted bg-ep-raised border-ep-border-default'  },
}

export default function StripePayoutsPage() {
  const [payouts,  setPayouts]  = useState<Payout[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/stripe/payouts')
      .then(r => r.json())
      .then((data: Payout[]) => setPayouts(Array.isArray(data) ? data : []))
      .catch(() => { /* ignorar */ })
      .finally(() => setLoading(false))
  }, [])

  const total = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Transferências</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            {loading ? 'Carregando…' : (
              <>
                {payouts.length} transferência{payouts.length !== 1 ? 's' : ''} ·{' '}
                <span className="text-ep-accent">{formatEUR(total)}</span> pago
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ep-raised border border-ep-border-default text-ep-secondary text-xs">
            <Banknote size={13} />
            Stripe Payouts
          </span>
        </div>
      </div>

      <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ep-border-subtle">
                {['ID', 'Valor', 'Status', 'Chegada', 'Descrição', 'Criado em'].map(h => (
                  <th key={h} className="text-left text-ep-muted text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-ep-muted text-sm">
                    Nenhuma transferência registada
                  </td>
                </tr>
              ) : payouts.map(p => {
                const s = statusConfig[p.status] ?? statusConfig.pending
                return (
                  <tr key={p.id} className="border-b border-ep-border-subtle last:border-0 hover:bg-ep-raised/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-ep-muted text-xs font-mono">{p.id.slice(0, 16)}…</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-ep-primary text-sm font-semibold whitespace-nowrap">{formatEUR(p.amount)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border', s.className)}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-ep-secondary text-xs whitespace-nowrap">
                        {new Date(p.arrivalDate).toLocaleDateString('pt-PT')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-ep-secondary text-sm">{p.description || '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-ep-secondary text-xs whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString('pt-PT')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
