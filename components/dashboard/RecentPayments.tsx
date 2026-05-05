import clsx from 'clsx'
import type { Payment } from '@/lib/types/payment'
import { formatEUR, eurToBrlStr } from '@/lib/utils/currency'

const statusConfig: Record<string, { label: string; className: string }> = {
  succeeded:  { label: 'Aprovado',    className: 'text-ep-success bg-ep-success/10 border-ep-success/20' },
  failed:     { label: 'Falhou',      className: 'text-ep-danger  bg-ep-danger/10  border-ep-danger/20'  },
  pending:    { label: 'Pendente',    className: 'text-ep-warning bg-ep-warning/10 border-ep-warning/20' },
  processing: { label: 'Processando', className: 'text-ep-info    bg-ep-info/10    border-ep-info/20'    },
  refunded:   { label: 'Reembolso',   className: 'text-ep-info    bg-ep-info/10    border-ep-info/20'    },
  disputed:   { label: 'Disputado',   className: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
}

interface RecentPaymentsProps {
  payments: Payment[]
}

export default function RecentPayments({ payments }: RecentPaymentsProps) {
  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-ep-border-subtle">
        <div>
          <h3 className="text-ep-primary font-semibold text-md">Últimos Pagamentos</h3>
          <p className="text-ep-secondary text-xs mt-0.5">Transações recentes</p>
        </div>
        <span className="text-ep-muted text-xs">{payments.length} registos</span>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-ep-border-subtle">
        {payments.map((p) => {
          const s = statusConfig[p.status] ?? statusConfig.pending
          return (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-ep-primary text-sm font-medium truncate">{p.customer}</p>
                  <span className={clsx(
                    'inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium border flex-shrink-0',
                    s.className,
                  )}>
                    {s.label}
                  </span>
                </div>
                <p className="text-ep-muted text-xs truncate">{p.product} · {p.method}</p>
                <p className="text-ep-muted text-xs">
                  {new Date(p.date + 'T00:00:00').toLocaleDateString('pt-PT')}
                </p>
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
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ep-border-subtle">
              {['ID', 'Cliente', 'Produto', 'Método', 'Valor (EUR / BRL)', 'Status', 'Data'].map((h) => (
                <th key={h} className="text-left text-ep-muted text-xs font-medium px-5 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const s = statusConfig[p.status] ?? statusConfig.pending
              return (
                <tr key={p.id} className="border-b border-ep-border-subtle last:border-0 hover:bg-ep-raised/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-ep-muted text-xs font-mono">{p.id.slice(0, 14)}…</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-ep-primary text-sm font-medium whitespace-nowrap">{p.customer}</p>
                    <p className="text-ep-muted text-xs">{p.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-ep-secondary text-sm whitespace-nowrap">{p.product}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-ep-secondary text-sm">{p.method}</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-ep-primary text-sm font-semibold whitespace-nowrap">{formatEUR(p.amount)}</p>
                    <p className="text-ep-muted text-xs">≈ {eurToBrlStr(p.amount)}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border',
                      s.className,
                    )}>
                      {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-ep-secondary text-xs whitespace-nowrap">
                      {new Date(p.date + 'T00:00:00').toLocaleDateString('pt-PT')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
