'use client'

import { useState, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import {
  Banknote, AlertTriangle, Users, RefreshCw, ArrowDownCircle,
  Activity, ShieldAlert, CheckCircle2, Clock,
  Tag, ReceiptText, Scale, Layers, Search, Plus,
} from 'lucide-react'
import { formatEUR } from '@/lib/utils/currency'
import { TableSkeleton } from '@/components/ui/Skeleton'

interface Balance { available: number; pending: number; currency: string }
interface Payout { id: string; amount: number; currency: string; status: string; arrivalDate: string; description: string; createdAt: string }
interface FraudWarning { id: string; paymentIntentId: string; chargeId: string; fraudType: string; actionable: boolean; createdAt: string }
interface StripeCustomer { id: string; name: string; email: string; phone: string; stripeCustomerId: string; createdAt: string }
interface StripeDispute { id: string; chargeId: string; paymentIntentId: string; amount: number; currency: string; status: string; reason: string; evidenceDueBy: string | null; createdAt: string }
interface StripeRefund { id: string; chargeId: string; paymentIntentId: string; amount: number; currency: string; status: string; reason: string; createdAt: string }
interface BalanceTx { id: string; type: string; amount: number; fee: number; net: number; currency: string; status: string; description: string; createdAt: string }
interface StripeCoupon { id: string; name: string; amountOff: number | null; percentOff: number | null; currency: string; duration: string; timesRedeemed: number; valid: boolean; createdAt: string }
interface StripePromoCode { id: string; couponId: string; code: string; active: boolean; timesRedeemed: number; expiresAt: string | null; createdAt: string }
interface StripeEvent { id: string; type: string; livemode: boolean; objectId: string; processed: boolean; error: string | null; receivedAt: string }

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

const payoutCfg: Record<string, { label: string; cls: string }> = {
  paid:       { label: 'Pago',         cls: 'text-ep-success bg-ep-success/10 border-ep-success/20' },
  pending:    { label: 'Pendente',     cls: 'text-ep-warning bg-ep-warning/10 border-ep-warning/20' },
  in_transit: { label: 'Em trânsito',  cls: 'text-ep-info bg-ep-info/10 border-ep-info/20' },
  failed:     { label: 'Falhou',       cls: 'text-ep-danger bg-ep-danger/10 border-ep-danger/20' },
  canceled:   { label: 'Cancelado',    cls: 'text-ep-muted bg-ep-raised border-ep-border-default' },
  reconciled: { label: 'Reconciliado', cls: 'text-ep-accent bg-ep-accent/10 border-ep-accent/20' },
}

const disputeCfg: Record<string, { label: string; cls: string }> = {
  needs_response:         { label: 'Resposta necessária', cls: 'text-ep-danger bg-ep-danger/10 border-ep-danger/20' },
  warning_needs_response: { label: 'Resposta necessária', cls: 'text-ep-danger bg-ep-danger/10 border-ep-danger/20' },
  under_review:           { label: 'Em revisão',          cls: 'text-ep-warning bg-ep-warning/10 border-ep-warning/20' },
  warning_under_review:   { label: 'Em revisão',          cls: 'text-ep-warning bg-ep-warning/10 border-ep-warning/20' },
  won:                    { label: 'Ganha',               cls: 'text-ep-success bg-ep-success/10 border-ep-success/20' },
  lost:                   { label: 'Perdida',             cls: 'text-ep-danger bg-ep-danger/10 border-ep-danger/20' },
  charge_refunded:        { label: 'Reembolsado',         cls: 'text-ep-muted bg-ep-raised border-ep-border-default' },
  warning_closed:         { label: 'Fechada',             cls: 'text-ep-muted bg-ep-raised border-ep-border-default' },
}

type Tab = 'visao-geral' | 'transferencias' | 'transacoes' | 'reembolsos' | 'disputas' | 'cupoes' | 'clientes' | 'fraudes' | 'eventos'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'visao-geral',    label: 'Visão Geral',    icon: Layers      },
  { id: 'transferencias', label: 'Transferências', icon: Banknote    },
  { id: 'transacoes',     label: 'Transações',     icon: Activity    },
  { id: 'reembolsos',     label: 'Reembolsos',     icon: ReceiptText },
  { id: 'disputas',       label: 'Disputas',       icon: Scale       },
  { id: 'cupoes',         label: 'Cupões',         icon: Tag         },
  { id: 'clientes',       label: 'Clientes',       icon: Users       },
  { id: 'fraudes',        label: 'Fraudes',        icon: ShieldAlert },
  { id: 'eventos',        label: 'Eventos',        icon: Activity    },
]

function Pill({ label, cls }: { label: string; cls: string }) {
  return <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium border', cls)}>{label}</span>
}

function KpiCard({ label, value, icon: Icon, color, loading }: { label: string; value: string; icon: React.ElementType; color: string; loading: boolean }) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-ep-secondary text-xs">{label}</span>
        <Icon size={14} className={color} />
      </div>
      {loading ? <div className="h-6 w-24 bg-ep-raised rounded animate-pulse" /> : <p className={clsx('text-xl font-bold', color)}>{value}</p>}
    </div>
  )
}

function Card({ title, icon: Icon, cls, children }: { title: string; icon: React.ElementType; cls: string; children: React.ReactNode }) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-ep-border-subtle flex items-center gap-2">
        <Icon size={14} className={cls} />
        <span className="text-ep-primary text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function StripePage() {
  const [tab,        setTab]        = useState<Tab>('visao-geral')
  const [balance,    setBalance]    = useState<Balance | null>(null)
  const [payouts,    setPayouts]    = useState<Payout[]>([])
  const [frauds,     setFrauds]     = useState<FraudWarning[]>([])
  const [customers,  setCustomers]  = useState<StripeCustomer[]>([])
  const [disputes,   setDisputes]   = useState<StripeDispute[]>([])
  const [refunds,    setRefunds]    = useState<StripeRefund[]>([])
  const [txns,       setTxns]       = useState<BalanceTx[]>([])
  const [coupons,    setCoupons]    = useState<StripeCoupon[]>([])
  const [promoCodes, setPromoCodes] = useState<StripePromoCode[]>([])
  const [events,     setEvents]     = useState<StripeEvent[]>([])
  const [loading,    setLoading]    = useState(true)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [balR, payR, fraudR, custR, dispR, refR, txR, couR, evR] = await Promise.all([
        fetch('/api/stripe/balance').then(r => r.json()),
        fetch('/api/stripe/payouts').then(r => r.json()),
        fetch('/api/stripe/fraud').then(r => r.json()),
        fetch('/api/stripe/customers').then(r => r.json()),
        fetch('/api/stripe/disputes').then(r => r.json()),
        fetch('/api/stripe/refunds').then(r => r.json()),
        fetch('/api/stripe/transactions?limit=50').then(r => r.json()),
        fetch('/api/stripe/coupons').then(r => r.json()),
        fetch('/api/stripe/events?limit=50').then(r => r.json()),
      ])
      setBalance(balR)
      setPayouts(Array.isArray(payR) ? payR : [])
      setFrauds(Array.isArray(fraudR) ? fraudR : [])
      setCustomers(Array.isArray(custR) ? custR : [])
      setDisputes(Array.isArray(dispR) ? dispR : [])
      setRefunds(Array.isArray(refR) ? refR : [])
      setTxns(Array.isArray(txR) ? txR : [])
      setCoupons(Array.isArray(couR?.coupons) ? couR.coupons : [])
      setPromoCodes(Array.isArray(couR?.promoCodes) ? couR.promoCodes : [])
      setEvents(Array.isArray(evR?.data) ? evR.data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function runBackfill() {
    setBackfilling(true)
    setBackfillMsg('')
    try {
      const d = await fetch('/api/stripe/backfill', { method: 'POST' }).then(r => r.json())
      setBackfillMsg(`Backfill: ${d.payouts ?? 0} transferências, ${d.charges ?? 0} charges, ${d.disputes ?? 0} disputas, ${d.refunds ?? 0} reembolsos, ${d.customers ?? 0} clientes`)
      await load()
    } finally {
      setBackfilling(false)
    }
  }

  const totalPaid    = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const actionFrauds = frauds.filter(f => f.actionable).length
  const openDisputes = disputes.filter(d => ['needs_response', 'warning_needs_response', 'under_review'].includes(d.status)).length

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Stripe</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">Painel completo — saldo, transferências, transações, reembolsos, disputas, cupões, clientes e fraudes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runBackfill} disabled={backfilling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ep-raised border border-ep-border-default text-ep-secondary hover:text-ep-primary transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={backfilling ? 'animate-spin' : ''} />
            {backfilling ? 'Sincronizando…' : 'Backfill'}
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ep-raised border border-ep-border-default text-ep-secondary hover:text-ep-primary transition-colors">
            <RefreshCw size={13} />Atualizar
          </button>
        </div>
      </div>

      {backfillMsg && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-ep-success/10 border border-ep-success/20 text-ep-success text-xs">
          <CheckCircle2 size={13} />{backfillMsg}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Disponível"       value={balance ? formatEUR(balance.available) : '—'} icon={CheckCircle2}    color="text-ep-success" loading={loading} />
        <KpiCard label="Pendente"         value={balance ? formatEUR(balance.pending)   : '—'} icon={Clock}           color="text-ep-warning" loading={loading} />
        <KpiCard label="Transferido"      value={formatEUR(totalPaid)}                          icon={ArrowDownCircle} color="text-ep-accent"  loading={loading} />
        <KpiCard label="Disputas abertas" value={String(openDisputes)}                          icon={Scale}           color={openDisputes > 0 ? 'text-ep-danger' : 'text-ep-muted'} loading={loading} />
      </div>

      <div className="flex gap-0.5 border-b border-ep-border-subtle overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === t.id ? 'border-ep-accent text-ep-accent' : 'border-transparent text-ep-secondary hover:text-ep-primary')}>
            <t.icon size={12} />{t.label}
            {t.id === 'fraudes'  && actionFrauds > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] border bg-ep-danger/20 text-ep-danger border-ep-danger/30">{actionFrauds}</span>}
            {t.id === 'disputas' && openDisputes > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] border bg-ep-danger/20 text-ep-danger border-ep-danger/30">{openDisputes}</span>}
          </button>
        ))}
      </div>

      {tab === 'visao-geral'    && <OverviewTab balance={balance} payouts={payouts} frauds={frauds} disputes={disputes} refunds={refunds} customers={customers} loading={loading} />}
      {tab === 'transferencias' && <PayoutsTab payouts={payouts} loading={loading} />}
      {tab === 'transacoes'     && <TransactionsTab txns={txns} loading={loading} />}
      {tab === 'reembolsos'     && <RefundsTab refunds={refunds} loading={loading} />}
      {tab === 'disputas'       && <DisputesTab disputes={disputes} loading={loading} />}
      {tab === 'cupoes'         && <CouponsTab coupons={coupons} promoCodes={promoCodes} loading={loading} onRefresh={load} />}
      {tab === 'clientes'       && <CustomersTab customers={customers} loading={loading} />}
      {tab === 'fraudes'        && <FraudsTab frauds={frauds} loading={loading} />}
      {tab === 'eventos'        && <EventsTab events={events} loading={loading} />}
    </div>
  )
}

// ─── OverviewTab ──────────────────────────────────────────────────────────────

function OverviewTab({ balance, payouts, frauds, disputes, refunds, customers, loading }: {
  balance: Balance | null; payouts: Payout[]; frauds: FraudWarning[]
  disputes: StripeDispute[]; refunds: StripeRefund[]; customers: StripeCustomer[]; loading: boolean
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Últimas Transferências" icon={Banknote} cls="text-ep-accent">
        {loading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="divide-y divide-ep-border-subtle">
            {payouts.slice(0, 5).length === 0 && <p className="text-ep-muted text-xs text-center py-6">Nenhuma transferência</p>}
            {payouts.slice(0, 5).map(p => {
              const s = payoutCfg[p.status] ?? { label: p.status, cls: 'text-ep-muted bg-ep-raised border-ep-border-default' }
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                  <div><p className="text-ep-primary text-xs font-medium">{formatEUR(p.amount)}</p><p className="text-ep-muted text-[11px]">{fmt(p.arrivalDate)}</p></div>
                  <Pill label={s.label} cls={s.cls} />
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Disputas Abertas" icon={Scale} cls="text-ep-danger">
        {loading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="divide-y divide-ep-border-subtle">
            {disputes.slice(0, 5).length === 0 && <p className="text-ep-muted text-xs text-center py-6">Nenhuma disputa</p>}
            {disputes.slice(0, 5).map(d => {
              const s = disputeCfg[d.status] ?? { label: d.status, cls: 'text-ep-muted bg-ep-raised border-ep-border-default' }
              return (
                <div key={d.id} className="flex items-center justify-between px-4 py-2.5">
                  <div><p className="text-ep-primary text-xs font-medium">{formatEUR(d.amount)}</p><p className="text-ep-muted text-[11px]">{d.reason}</p></div>
                  <Pill label={s.label} cls={s.cls} />
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Últimos Reembolsos" icon={ReceiptText} cls="text-ep-warning">
        {loading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="divide-y divide-ep-border-subtle">
            {refunds.slice(0, 5).length === 0 && <p className="text-ep-muted text-xs text-center py-6">Nenhum reembolso</p>}
            {refunds.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                <div><p className="text-ep-primary text-xs font-medium">{formatEUR(r.amount)}</p><p className="text-ep-muted text-[11px]">{r.reason || '—'}</p></div>
                <Pill label={r.status} cls={r.status === 'succeeded' ? 'text-ep-success bg-ep-success/10 border-ep-success/20' : 'text-ep-muted bg-ep-raised border-ep-border-default'} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Alertas de Fraude" icon={ShieldAlert} cls="text-ep-danger">
        {loading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="divide-y divide-ep-border-subtle">
            {frauds.slice(0, 5).length === 0 && <p className="text-ep-muted text-xs text-center py-6">Nenhum alerta</p>}
            {frauds.slice(0, 5).map(f => (
              <div key={f.id} className="flex items-center justify-between px-4 py-2.5">
                <div><p className="text-ep-primary text-xs font-medium font-mono">{f.fraudType}</p><p className="text-ep-muted text-[11px]">{fmt(f.createdAt)}</p></div>
                {f.actionable
                  ? <Pill label="Accionável" cls="text-ep-danger bg-ep-danger/10 border-ep-danger/20" />
                  : <Pill label="Info"       cls="text-ep-muted bg-ep-raised border-ep-border-default" />}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Clientes Recentes" icon={Users} cls="text-ep-accent">
        {loading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="divide-y divide-ep-border-subtle">
            {customers.slice(0, 5).length === 0 && <p className="text-ep-muted text-xs text-center py-6">Nenhum cliente</p>}
            {customers.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-ep-accent/20 border border-ep-accent/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-ep-accent text-[10px] font-bold">{(c.name || c.email || '?')[0].toUpperCase()}</span>
                  </div>
                  <div><p className="text-ep-primary text-xs font-medium">{c.name || '—'}</p><p className="text-ep-muted text-[11px]">{c.email}</p></div>
                </div>
                <p className="text-ep-muted text-[11px]">{fmt(c.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Saldo" icon={Banknote} cls="text-ep-success">
        {loading ? <TableSkeleton rows={2} cols={2} /> : (
          <div className="divide-y divide-ep-border-subtle">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-ep-secondary text-xs">Disponível</span>
              <span className="text-ep-success font-bold text-sm">{balance ? formatEUR(balance.available) : '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-ep-secondary text-xs">Pendente</span>
              <span className="text-ep-warning font-bold text-sm">{balance ? formatEUR(balance.pending) : '—'}</span>
            </div>
          </div>
        )}
      </Card>
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
            <thead><tr className="border-b border-ep-border-subtle">
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">ID</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Valor</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Estado</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Chegada</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Descrição</th>
            </tr></thead>
            <tbody className="divide-y divide-ep-border-subtle">
              {payouts.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhuma transferência</td></tr>}
              {payouts.map(p => {
                const s = payoutCfg[p.status] ?? { label: p.status, cls: 'text-ep-muted bg-ep-raised border-ep-border-default' }
                return (
                  <tr key={p.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5 text-ep-muted font-mono">{p.id.slice(0, 16)}…</td>
                    <td className="px-4 py-2.5 text-ep-primary font-medium">{formatEUR(p.amount)}</td>
                    <td className="px-4 py-2.5"><Pill label={s.label} cls={s.cls} /></td>
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

// ─── TransactionsTab ──────────────────────────────────────────────────────────

const REVENUE_TYPES = ['payment', 'charge', 'payout_reversal', 'adjustment']

function TransactionsTab({ txns, loading }: { txns: BalanceTx[]; loading: boolean }) {
  const [filter, setFilter] = useState<'all' | 'revenue'>('revenue')
  const displayed  = filter === 'revenue' ? txns.filter(t => REVENUE_TYPES.includes(t.type)) : txns
  const revTxns    = txns.filter(t => ['payment', 'charge'].includes(t.type))
  const totalGross = revTxns.reduce((s, t) => s + t.amount, 0)
  const totalFee   = revTxns.reduce((s, t) => s + t.fee, 0)
  const totalNet   = revTxns.reduce((s, t) => s + t.net, 0)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-3">
          <p className="text-ep-muted text-xs">Volume bruto (pagamentos)</p>
          <p className="text-ep-primary font-bold text-sm mt-1">{formatEUR(totalGross)}</p>
        </div>
        <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-3">
          <p className="text-ep-muted text-xs">Fees Stripe</p>
          <p className="text-ep-danger font-bold text-sm mt-1">-{formatEUR(totalFee)}</p>
        </div>
        <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-3">
          <p className="text-ep-muted text-xs">Líquido</p>
          <p className="text-ep-success font-bold text-sm mt-1">{formatEUR(totalNet)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setFilter('revenue')}
          className={clsx('px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
            filter === 'revenue' ? 'bg-ep-accent/10 text-ep-accent border-ep-accent/20' : 'bg-ep-raised text-ep-secondary border-ep-border-default hover:text-ep-primary')}>
          Só pagamentos
        </button>
        <button onClick={() => setFilter('all')}
          className={clsx('px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
            filter === 'all' ? 'bg-ep-accent/10 text-ep-accent border-ep-accent/20' : 'bg-ep-raised text-ep-secondary border-ep-border-default hover:text-ep-primary')}>
          Todas ({txns.length})
        </button>
      </div>
      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <TableSkeleton rows={8} cols={6} /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-ep-border-subtle">
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Tipo</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Bruto</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Fee</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Líquido</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Estado</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Data</th>
              </tr></thead>
              <tbody className="divide-y divide-ep-border-subtle">
                {displayed.length === 0 && <tr><td colSpan={6} className="text-center text-ep-muted py-8">Nenhuma transação</td></tr>}
                {displayed.map(t => (
                  <tr key={t.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5 text-ep-secondary font-mono">{t.type}</td>
                    <td className={clsx('px-4 py-2.5 font-medium', t.amount >= 0 ? 'text-ep-primary' : 'text-ep-danger')}>{formatEUR(t.amount)}</td>
                    <td className="px-4 py-2.5 text-ep-danger">{t.fee > 0 ? `-${formatEUR(t.fee)}` : '—'}</td>
                    <td className={clsx('px-4 py-2.5 font-medium', t.net >= 0 ? 'text-ep-success' : 'text-ep-danger')}>{formatEUR(t.net)}</td>
                    <td className="px-4 py-2.5">
                      <Pill label={t.status} cls={t.status === 'available' ? 'text-ep-success bg-ep-success/10 border-ep-success/20' : 'text-ep-warning bg-ep-warning/10 border-ep-warning/20'} />
                    </td>
                    <td className="px-4 py-2.5 text-ep-muted">{fmt(t.createdAt)}</td>
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

// ─── RefundsTab ───────────────────────────────────────────────────────────────

function RefundsTab({ refunds, loading }: { refunds: StripeRefund[]; loading: boolean }) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        {loading ? <TableSkeleton rows={8} cols={5} /> : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-ep-border-subtle">
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">ID</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Valor</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Estado</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Motivo</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Data</th>
            </tr></thead>
            <tbody className="divide-y divide-ep-border-subtle">
              {refunds.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhum reembolso</td></tr>}
              {refunds.map(r => (
                <tr key={r.id} className="hover:bg-ep-raised/50 transition-colors">
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{r.id.slice(0, 16)}…</td>
                  <td className="px-4 py-2.5 text-ep-primary font-medium">{formatEUR(r.amount)}</td>
                  <td className="px-4 py-2.5">
                    <Pill label={r.status} cls={r.status === 'succeeded' ? 'text-ep-success bg-ep-success/10 border-ep-success/20' : 'text-ep-warning bg-ep-warning/10 border-ep-warning/20'} />
                  </td>
                  <td className="px-4 py-2.5 text-ep-muted">{r.reason || '—'}</td>
                  <td className="px-4 py-2.5 text-ep-secondary">{fmt(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── DisputesTab ──────────────────────────────────────────────────────────────

function DisputesTab({ disputes, loading }: { disputes: StripeDispute[]; loading: boolean }) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        {loading ? <TableSkeleton rows={8} cols={5} /> : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-ep-border-subtle">
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">ID</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Valor</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Estado</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Motivo</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Prazo evidência</th>
            </tr></thead>
            <tbody className="divide-y divide-ep-border-subtle">
              {disputes.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhuma disputa</td></tr>}
              {disputes.map(d => {
                const s = disputeCfg[d.status] ?? { label: d.status, cls: 'text-ep-muted bg-ep-raised border-ep-border-default' }
                return (
                  <tr key={d.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5 text-ep-muted font-mono">{d.id.slice(0, 16)}…</td>
                    <td className="px-4 py-2.5 text-ep-primary font-medium">{formatEUR(d.amount)}</td>
                    <td className="px-4 py-2.5"><Pill label={s.label} cls={s.cls} /></td>
                    <td className="px-4 py-2.5 text-ep-muted">{d.reason}</td>
                    <td className="px-4 py-2.5 text-ep-secondary">{d.evidenceDueBy ? fmt(d.evidenceDueBy) : '—'}</td>
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

// ─── CouponsTab ───────────────────────────────────────────────────────────────

function CouponsTab({ coupons, promoCodes, loading, onRefresh }: {
  coupons: StripeCoupon[]; promoCodes: StripePromoCode[]; loading: boolean; onRefresh: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'percent', value: '', currency: 'eur', duration: 'once', code: '', maxRedemptions: '' })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/stripe/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:           form.name,
          type:           form.type,
          value:          form.type === 'percent' ? Number(form.value) : Math.round(Number(form.value) * 100),
          currency:       form.currency,
          duration:       form.duration,
          code:           form.code || undefined,
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
        }),
      })
      setShowModal(false)
      setForm({ name: '', type: 'percent', value: '', currency: 'eur', duration: 'once', code: '', maxRedemptions: '' })
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-ep-primary text-sm font-medium">Cupões e Códigos Promocionais</h3>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ep-accent text-ep-base hover:bg-ep-accent/90 transition-colors">
          <Plus size={13} />Novo cupão
        </button>
      </div>

      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-ep-border-subtle">
          <span className="text-ep-primary text-xs font-medium">Cupões ({coupons.length})</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? <TableSkeleton rows={4} cols={5} /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-ep-border-subtle">
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Nome</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Desconto</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Duração</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Usos</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Válido</th>
              </tr></thead>
              <tbody className="divide-y divide-ep-border-subtle">
                {coupons.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-6">Nenhum cupão</td></tr>}
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5 text-ep-primary font-medium">{c.name}</td>
                    <td className="px-4 py-2.5 text-ep-accent font-medium">
                      {c.percentOff ? `${c.percentOff}%` : c.amountOff ? formatEUR(c.amountOff) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-ep-secondary">{c.duration}</td>
                    <td className="px-4 py-2.5 text-ep-muted">{c.timesRedeemed}</td>
                    <td className="px-4 py-2.5">
                      {c.valid
                        ? <Pill label="Activo"    cls="text-ep-success bg-ep-success/10 border-ep-success/20" />
                        : <Pill label="Inactivo"  cls="text-ep-muted bg-ep-raised border-ep-border-default" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-ep-border-subtle">
          <span className="text-ep-primary text-xs font-medium">Códigos Promocionais ({promoCodes.length})</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? <TableSkeleton rows={4} cols={4} /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-ep-border-subtle">
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Código</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Cupão</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Usos</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Expira</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Estado</th>
              </tr></thead>
              <tbody className="divide-y divide-ep-border-subtle">
                {promoCodes.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-6">Nenhum código</td></tr>}
                {promoCodes.map(p => (
                  <tr key={p.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5 text-ep-accent font-mono font-bold">{p.code}</td>
                    <td className="px-4 py-2.5 text-ep-muted font-mono text-[10px]">{p.couponId.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5 text-ep-muted">{p.timesRedeemed}</td>
                    <td className="px-4 py-2.5 text-ep-muted">{p.expiresAt ? fmt(p.expiresAt) : '—'}</td>
                    <td className="px-4 py-2.5">
                      {p.active
                        ? <Pill label="Activo"   cls="text-ep-success bg-ep-success/10 border-ep-success/20" />
                        : <Pill label="Inactivo" cls="text-ep-muted bg-ep-raised border-ep-border-default" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-ep-surface border border-ep-border-subtle rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ep-border-subtle">
              <h2 className="text-ep-primary font-semibold text-sm">Novo Cupão</h2>
              <button onClick={() => setShowModal(false)} className="text-ep-muted hover:text-ep-primary text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div>
                <label className="text-ep-secondary text-xs block mb-1">Nome</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full px-3 py-2 text-xs bg-ep-raised border border-ep-border-default rounded-md text-ep-primary focus:outline-none focus:border-ep-accent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-ep-secondary text-xs block mb-1">Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-ep-raised border border-ep-border-default rounded-md text-ep-primary focus:outline-none focus:border-ep-accent">
                    <option value="percent">Percentagem (%)</option>
                    <option value="amount">Valor fixo (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-ep-secondary text-xs block mb-1">{form.type === 'percent' ? 'Percentagem' : 'Valor (€)'}</label>
                  <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required min="0"
                    className="w-full px-3 py-2 text-xs bg-ep-raised border border-ep-border-default rounded-md text-ep-primary focus:outline-none focus:border-ep-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-ep-secondary text-xs block mb-1">Duração</label>
                  <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-ep-raised border border-ep-border-default rounded-md text-ep-primary focus:outline-none focus:border-ep-accent">
                    <option value="once">Uma vez</option>
                    <option value="forever">Para sempre</option>
                    <option value="repeating">Repetido</option>
                  </select>
                </div>
                <div>
                  <label className="text-ep-secondary text-xs block mb-1">Máx. usos</label>
                  <input type="number" value={form.maxRedemptions} onChange={e => setForm(f => ({ ...f, maxRedemptions: e.target.value }))} min="1" placeholder="Ilimitado"
                    className="w-full px-3 py-2 text-xs bg-ep-raised border border-ep-border-default rounded-md text-ep-primary focus:outline-none focus:border-ep-accent" />
                </div>
              </div>
              <div>
                <label className="text-ep-secondary text-xs block mb-1">Código promocional (opcional)</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="ex: VERAO20"
                  className="w-full px-3 py-2 text-xs bg-ep-raised border border-ep-border-default rounded-md text-ep-primary font-mono focus:outline-none focus:border-ep-accent" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-3 py-2 rounded-md text-xs font-medium bg-ep-raised border border-ep-border-default text-ep-secondary hover:text-ep-primary transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-3 py-2 rounded-md text-xs font-medium bg-ep-accent text-ep-base hover:bg-ep-accent/90 transition-colors disabled:opacity-50">
                  {saving ? 'Criando…' : 'Criar cupão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome ou email…"
          className="w-full pl-8 pr-3 py-2 text-xs bg-ep-surface border border-ep-border-default rounded-md text-ep-primary placeholder:text-ep-muted focus:outline-none focus:border-ep-accent" />
      </div>
      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? <TableSkeleton rows={8} cols={5} /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-ep-border-subtle">
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Cliente</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Email</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Telefone</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Stripe ID</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Criado</th>
              </tr></thead>
              <tbody className="divide-y divide-ep-border-subtle">
                {filtered.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhum cliente</td></tr>}
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

// ─── FraudsTab ────────────────────────────────────────────────────────────────

function FraudsTab({ frauds, loading }: { frauds: FraudWarning[]; loading: boolean }) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        {loading ? <TableSkeleton rows={8} cols={5} /> : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-ep-border-subtle">
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">ID</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Tipo</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Payment Intent</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Accionável</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Data</th>
            </tr></thead>
            <tbody className="divide-y divide-ep-border-subtle">
              {frauds.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhum alerta de fraude</td></tr>}
              {frauds.map(f => (
                <tr key={f.id} className="hover:bg-ep-raised/50 transition-colors">
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{f.id.slice(0, 16)}…</td>
                  <td className="px-4 py-2.5 text-ep-primary font-mono">{f.fraudType}</td>
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{f.paymentIntentId ? f.paymentIntentId.slice(0, 20) + '…' : '—'}</td>
                  <td className="px-4 py-2.5">
                    {f.actionable
                      ? <span className="flex items-center gap-1 text-ep-danger text-xs"><AlertTriangle size={11} />Sim</span>
                      : <span className="flex items-center gap-1 text-ep-muted text-xs"><CheckCircle2 size={11} />Não</span>}
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

// ─── EventsTab ────────────────────────────────────────────────────────────────

function EventsTab({ events, loading }: { events: StripeEvent[]; loading: boolean }) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        {loading ? <TableSkeleton rows={10} cols={5} /> : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-ep-border-subtle">
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">ID</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Tipo</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Modo</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Estado</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Recebido</th>
            </tr></thead>
            <tbody className="divide-y divide-ep-border-subtle">
              {events.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhum evento</td></tr>}
              {events.map(e => (
                <tr key={e.id} className="hover:bg-ep-raised/50 transition-colors">
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{e.id.slice(0, 16)}…</td>
                  <td className="px-4 py-2.5 text-ep-primary font-mono">{e.type}</td>
                  <td className="px-4 py-2.5">
                    {e.livemode
                      ? <Pill label="Live" cls="text-ep-success bg-ep-success/10 border-ep-success/20" />
                      : <Pill label="Test" cls="text-ep-warning bg-ep-warning/10 border-ep-warning/20" />}
                  </td>
                  <td className="px-4 py-2.5">
                    {e.error
                      ? <Pill label="Erro"       cls="text-ep-danger bg-ep-danger/10 border-ep-danger/20" />
                      : e.processed
                        ? <Pill label="Processado" cls="text-ep-success bg-ep-success/10 border-ep-success/20" />
                        : <Pill label="Pendente"   cls="text-ep-warning bg-ep-warning/10 border-ep-warning/20" />}
                  </td>
                  <td className="px-4 py-2.5 text-ep-muted">{fmt(e.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
