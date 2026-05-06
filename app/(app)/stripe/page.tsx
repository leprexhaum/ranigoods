'use client'

import { useState, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import {
  Banknote, AlertTriangle, Users, RefreshCw, ArrowDownCircle,
  CreditCard, Activity, ShieldAlert, CheckCircle2, XCircle, Clock,
} from 'lucide-react'
import { formatEUR } from '@/lib/utils/currency'
import { TableSkeleton } from '@/components/ui/Skeleton'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Balance { available: number; pending: number; currency: string; cached?: boolean }

interface Payout {
  id: string; amount: number; currency: string; status: string
  arrivalDate: string; description: string; createdAt: string
}

interface FraudWarning {
  id: string; paymentIntentId: string; chargeId: string
  fraudType: string; actionable: boolean; createdAt: string
}

interface StripeCustomer {
  id: string; name: string; email: string; phone: string
  stripeCustomerId: string; createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const payoutStatus: Record<string, { label: string; cls: string }> = {
  paid:        { label: 'Pago',        cls: 'text-ep-success bg-ep-success/10 border-ep-success/20' },
  pending:     { label: 'Pendente',    cls: 'text-ep-warning bg-ep-warning/10 border-ep-warning/20' },
  in_transit:  { label: 'Em trânsito', cls: 'text-ep-info   bg-ep-info/10   border-ep-info/20'     },
  failed:      { label: 'Falhou',      cls: 'text-ep-danger bg-ep-danger/10 border-ep-danger/20'   },
  canceled:    { label: 'Cancelado',   cls: 'text-ep-muted  bg-ep-raised    border-ep-border-default' },
  reconciled:  { label: 'Reconciliado', cls: 'text-ep-accent bg-ep-accent/10 border-ep-accent/20'  },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'visao-geral' | 'transferencias' | 'fraudes' | 'clientes'

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'visao-geral',    label: 'Visão Geral',    icon: Activity     },
  { id: 'transferencias', label: 'Transferências', icon: Banknote     },
  { id: 'fraudes',        label: 'Alertas Fraude', icon: ShieldAlert  },
  { id: 'clientes',       label: 'Clientes',       icon: Users        },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StripePage() {
  const [tab,       setTab]       = useState<Tab>('visao-geral')
  const [balance,   setBalance]   = useState<Balance | null>(null)
  const [payouts,   setPayouts]   = useState<Payout[]>([])
  const [frauds,    setFrauds]    = useState<FraudWarning[]>([])
  const [customers, setCustomers] = useState<StripeCustomer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<{ updated: number; errors: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [balRes, payRes, fraudRes, custRes] = await Promise.all([
        fetch('/api/stripe/balance').then(r => r.json()),
        fetch('/api/stripe/payouts').then(r => r.json()),
        fetch('/api/stripe/fraud').then(r => r.json()),
        fetch('/api/stripe/customers').then(r => r.json()),
      ])
      setBalance(balRes)
      setPayouts(Array.isArray(payRes) ? payRes : [])
      setFrauds(Array.isArray(fraudRes) ? fraudRes : [])
      setCustomers(Array.isArray(custRes) ? custRes : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function runBackfill() {
    setBackfilling(true)
    setBackfillResult(null)
    try {
      const res = await fetch('/api/stripe/backfill', { method: 'POST' })
      const data = await res.json()
      setBackfillResult(data)
      await load()
    } finally {
      setBackfilling(false)
    }
  }

  const totalPaid    = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const actionFrauds = frauds.filter(f => f.actionable).length

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Stripe</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            Saldo, transferências, alertas de fraude e clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runBackfill}
            disabled={backfilling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ep-raised border border-ep-border-default text-ep-secondary hover:text-ep-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={backfilling ? 'animate-spin' : ''} />
            {backfilling ? 'Sincronizando…' : 'Backfill charges'}
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ep-raised border border-ep-border-default text-ep-secondary hover:text-ep-primary transition-colors"
          >
            <RefreshCw size={13} />
            Atualizar
          </button>
        </div>
      </div>

      {backfillResult && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-ep-success/10 border border-ep-success/20 text-ep-success text-xs">
          <CheckCircle2 size={13} />
          Backfill concluído: {backfillResult.updated} atualizados, {backfillResult.errors} erros
        </div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <BalanceCard
          label="Disponível"
          value={balance ? formatEUR(balance.available) : '—'}
          icon={CheckCircle2}
          color="text-ep-success"
          loading={loading}
        />
        <BalanceCard
          label="Pendente"
          value={balance ? formatEUR(balance.pending) : '—'}
          icon={Clock}
          color="text-ep-warning"
          loading={loading}
        />
        <BalanceCard
          label="Transferido (total)"
          value={formatEUR(totalPaid)}
          icon={ArrowDownCircle}
          color="text-ep-accent"
          loading={loading}
        />
        <BalanceCard
          label="Alertas activos"
          value={String(actionFrauds)}
          icon={AlertTriangle}
          color={actionFrauds > 0 ? 'text-ep-danger' : 'text-ep-muted'}
          loading={loading}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ep-border-subtle">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-ep-accent text-ep-accent'
                : 'border-transparent text-ep-secondary hover:text-ep-primary'
            )}
          >
            <t.icon size={13} />
            {t.label}
            {t.id === 'fraudes' && actionFrauds > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-ep-danger/20 text-ep-danger border border-ep-danger/30">
                {actionFrauds}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'visao-geral'    && <OverviewTab balance={balance} payouts={payouts} frauds={frauds} customers={customers} loading={loading} />}
      {tab === 'transferencias' && <PayoutsTab payouts={payouts} loading={loading} />}
      {tab === 'fraudes'        && <FraudsTab frauds={frauds} loading={loading} />}
      {tab === 'clientes'       && <CustomersTab customers={customers} loading={loading} />}
    </div>
  )
}

// ─── BalanceCard ──────────────────────────────────────────────────────────────

function BalanceCard({ label, value, icon: Icon, color, loading }: {
  label: string; value: string; icon: React.ElementType; color: string; loading: boolean
}) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-ep-secondary text-xs">{label}</span>
        <Icon size={14} className={color} />
      </div>
      {loading
        ? <div className="h-6 w-24 bg-ep-raised rounded animate-pulse" />
        : <p className={clsx('text-xl font-bold', color)}>{value}</p>
      }
    </div>
  )
}

// ─── OverviewTab ──────────────────────────────────────────────────────────────

function OverviewTab({ balance, payouts, frauds, customers, loading }: {
  balance: Balance | null; payouts: Payout[]; frauds: FraudWarning[]
  customers: StripeCustomer[]; loading: boolean
}) {
  const recentPayouts   = payouts.slice(0, 5)
  const recentFrauds    = frauds.slice(0, 5)
  const recentCustomers = customers.slice(0, 5)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Últimas transferências */}
      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-ep-border-subtle flex items-center gap-2">
          <Banknote size={14} className="text-ep-accent" />
          <span className="text-ep-primary text-sm font-medium">Últimas Transferências</span>
        </div>
        {loading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="divide-y divide-ep-border-subtle">
            {recentPayouts.length === 0 && (
              <p className="text-ep-muted text-xs text-center py-6">Nenhuma transferência</p>
            )}
            {recentPayouts.map(p => {
              const s = payoutStatus[p.status] ?? { label: p.status, cls: 'text-ep-muted bg-ep-raised border-ep-border-default' }
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-ep-primary text-xs font-medium">{formatEUR(p.amount)}</p>
                    <p className="text-ep-muted text-[11px]">{fmt(p.arrivalDate)}</p>
                  </div>
                  <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium border', s.cls)}>{s.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Alertas de fraude */}
      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-ep-border-subtle flex items-center gap-2">
          <ShieldAlert size={14} className="text-ep-danger" />
          <span className="text-ep-primary text-sm font-medium">Alertas de Fraude</span>
        </div>
        {loading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="divide-y divide-ep-border-subtle">
            {recentFrauds.length === 0 && (
              <p className="text-ep-muted text-xs text-center py-6">Nenhum alerta</p>
            )}
            {recentFrauds.map(f => (
              <div key={f.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-ep-primary text-xs font-medium font-mono">{f.fraudType}</p>
                  <p className="text-ep-muted text-[11px]">{fmt(f.createdAt)}</p>
                </div>
                {f.actionable
                  ? <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border text-ep-danger bg-ep-danger/10 border-ep-danger/20">Accionável</span>
                  : <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border text-ep-muted bg-ep-raised border-ep-border-default">Info</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clientes recentes */}
      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden lg:col-span-2">
        <div className="px-4 py-3 border-b border-ep-border-subtle flex items-center gap-2">
          <Users size={14} className="text-ep-accent" />
          <span className="text-ep-primary text-sm font-medium">Clientes Recentes</span>
        </div>
        {loading ? <TableSkeleton rows={4} cols={4} /> : (
          <div className="divide-y divide-ep-border-subtle">
            {recentCustomers.length === 0 && (
              <p className="text-ep-muted text-xs text-center py-6">Nenhum cliente</p>
            )}
            {recentCustomers.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-ep-accent/20 border border-ep-accent/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-ep-accent text-xs font-bold">{(c.name || c.email || '?')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-ep-primary text-xs font-medium">{c.name || '—'}</p>
                    <p className="text-ep-muted text-[11px]">{c.email}</p>
                  </div>
                </div>
                <p className="text-ep-muted text-[11px]">{fmt(c.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PayoutsTab ───────────────────────────────────────────────────────────────

function PayoutsTab({ payouts, loading }: { payouts: Payout[]; loading: boolean }) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        {loading ? <TableSkeleton rows={8} cols={5} /> : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ep-border-subtle">
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">ID</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Valor</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Estado</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Chegada</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ep-border-subtle">
              {payouts.length === 0 && (
                <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhuma transferência</td></tr>
              )}
              {payouts.map(p => {
                const s = payoutStatus[p.status] ?? { label: p.status, cls: 'text-ep-muted bg-ep-raised border-ep-border-default' }
                return (
                  <tr key={p.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5 text-ep-muted font-mono">{p.id.slice(0, 16)}…</td>
                    <td className="px-4 py-2.5 text-ep-primary font-medium">{formatEUR(p.amount)}</td>
                    <td className="px-4 py-2.5">
                      <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium border', s.cls)}>{s.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-ep-secondary">{fmt(p.arrivalDate)}</td>
                    <td className="px-4 py-2.5 text-ep-muted truncate max-w-[200px]">{p.description || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── FraudsTab ────────────────────────────────────────────────────────────────

function FraudsTab({ frauds, loading }: { frauds: FraudWarning[]; loading: boolean }) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        {loading ? <TableSkeleton rows={8} cols={5} /> : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ep-border-subtle">
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">ID</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Tipo</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Payment Intent</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Accionável</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ep-border-subtle">
              {frauds.length === 0 && (
                <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhum alerta de fraude</td></tr>
              )}
              {frauds.map(f => (
                <tr key={f.id} className="hover:bg-ep-raised/50 transition-colors">
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{f.id.slice(0, 16)}…</td>
                  <td className="px-4 py-2.5 text-ep-primary font-mono">{f.fraudType}</td>
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{f.paymentIntentId ? f.paymentIntentId.slice(0, 20) + '…' : '—'}</td>
                  <td className="px-4 py-2.5">
                    {f.actionable
                      ? <span className="flex items-center gap-1 text-ep-danger"><AlertTriangle size={11} /> Sim</span>
                      : <span className="flex items-center gap-1 text-ep-muted"><XCircle size={11} /> Não</span>
                    }
                  </td>
                  <td className="px-4 py-2.5 text-ep-secondary">{fmt(f.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── CustomersTab ─────────────────────────────────────────────────────────────

function CustomersTab({ customers, loading }: { customers: StripeCustomer[]; loading: boolean }) {
  const [search, setSearch] = useState('')
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <div className="relative">
        <CreditCard size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por nome ou email…"
          className="w-full pl-8 pr-3 py-2 text-xs bg-ep-surface border border-ep-border-default rounded-md text-ep-primary placeholder:text-ep-muted focus:outline-none focus:border-ep-accent"
        />
      </div>
      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <TableSkeleton rows={8} cols={4} /> : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ep-border-subtle">
                  <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Cliente</th>
                  <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Email</th>
                  <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Telefone</th>
                  <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Stripe ID</th>
                  <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Criado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ep-border-subtle">
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhum cliente</td></tr>
                )}
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-ep-accent/20 border border-ep-accent/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-ep-accent text-[10px] font-bold">{(c.name || c.email || '?')[0].toUpperCase()}</span>
                        </div>
                        <span className="text-ep-primary font-medium">{c.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ep-secondary">{c.email || '—'}</td>
                    <td className="px-4 py-2.5 text-ep-muted">{c.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-ep-muted font-mono text-[10px]">{c.stripeCustomerId}</td>
                    <td className="px-4 py-2.5 text-ep-muted">{fmt(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
