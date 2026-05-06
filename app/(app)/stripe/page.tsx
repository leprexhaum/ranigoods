'use client'

import { useState, useEffect, useCallback } from 'react'
import clsx from 'clsx'
import {
  Banknote, AlertTriangle, Users, RefreshCw, ArrowDownCircle,
  Activity, ShieldAlert, CheckCircle2, Clock,
  Tag, ReceiptText, Scale, Layers, Search, Plus,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { formatEUR, eurToBrlStr } from '@/lib/utils/currency'
import { TableSkeleton } from '@/components/ui/Skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Balance { available: number; pending: number; currency: string }
interface Payout { id: string; amount: number; currency: string; status: string; arrivalDate: string; description: string; createdAt: string }
interface FraudWarning { id: string; paymentIntentId: string; chargeId: string; fraudType: string; actionable: boolean; createdAt: string }
interface StripeCustomer { id: string; name: string; email: string; phone: string; stripeCustomerId: string; createdAt: string }
interface StripeDispute { id: string; chargeId: string; paymentIntentId: string; amount: number; currency: string; status: string; reason: string; evidenceDueBy: string | null; createdAt: string }
interface StripeRefund { id: string; chargeId: string; paymentIntentId: string; amount: number; currency: string; status: string; reason: string; createdAt: string }
interface BalanceTx { id: string; type: string; amount: number; fee: number; net: number; currency: string; status: string; description: string; createdAt: string }
interface StripeCoupon { id: string; name: string; amountOff: number | null; percentOff: number | null; currency: string; duration: string; timesRedeemed: number; valid: boolean; createdAt: string }
interface StripePromoCode { id: string; couponId: string; code: string; active: boolean; timesRedeemed: number; maxRedemptions: number | null; expiresAt: string | null; createdAt: string }
interface StripeEvent { id: string; type: string; livemode: boolean; objectId: string; processed: boolean; error: string | null; receivedAt: string }
interface Paginated<T> { data: T[]; total: number; pages: number; page: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) {
  const dt = new Date(d)
  const day = String(dt.getUTCDate()).padStart(2, '0')
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${day} ${months[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`
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

const REVENUE_TYPES = ['payment', 'charge', 'payout_reversal', 'adjustment']

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

// ─── Shared UI ────────────────────────────────────────────────────────────────

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

function Pagination({ page, pages, total, limit, onPage }: { page: number; pages: number; total: number; limit: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  const from = (page - 1) * limit + 1
  const to   = Math.min(page * limit, total)
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-ep-border-subtle">
      <span className="text-ep-muted text-xs">{from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded-md text-ep-muted hover:text-ep-primary hover:bg-ep-raised disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          let p: number
          if (pages <= 7) p = i + 1
          else if (page <= 4) p = i + 1
          else if (page >= pages - 3) p = pages - 6 + i
          else p = page - 3 + i
          return (
            <button key={p} onClick={() => onPage(p)}
              className={clsx('w-7 h-7 rounded-md text-xs font-medium transition-colors',
                p === page ? 'bg-ep-accent text-ep-base' : 'text-ep-secondary hover:bg-ep-raised hover:text-ep-primary')}>
              {p}
            </button>
          )
        })}
        <button onClick={() => onPage(page + 1)} disabled={page >= pages}
          className="p-1.5 rounded-md text-ep-muted hover:text-ep-primary hover:bg-ep-raised disabled:opacity-30 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StripePage() {
  const [tab,        setTab]        = useState<Tab>('visao-geral')
  const [balance,    setBalance]    = useState<Balance | null>(null)
  const [frauds,     setFrauds]     = useState<FraudWarning[]>([])
  const [coupons,    setCoupons]    = useState<StripeCoupon[]>([])
  const [promoCodes, setPromoCodes] = useState<StripePromoCode[]>([])
  const [overviewPayouts,   setOverviewPayouts]   = useState<Payout[]>([])
  const [overviewDisputes,  setOverviewDisputes]  = useState<StripeDispute[]>([])
  const [overviewRefunds,   setOverviewRefunds]   = useState<StripeRefund[]>([])
  const [overviewCustomers, setOverviewCustomers] = useState<StripeCustomer[]>([])
  const [loading,    setLoading]    = useState(true)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState('')

  const loadOverview = useCallback(async () => {
    setLoading(true)
    try {
      const [balR, fraudR, couR, payR, dispR, refR, custR] = await Promise.all([
        fetch('/api/stripe/balance').then(r => r.json()),
        fetch('/api/stripe/fraud').then(r => r.json()),
        fetch('/api/stripe/coupons').then(r => r.json()),
        fetch('/api/stripe/payouts?limit=5').then(r => r.json()),
        fetch('/api/stripe/disputes?limit=5').then(r => r.json()),
        fetch('/api/stripe/refunds?limit=5').then(r => r.json()),
        fetch('/api/stripe/customers?limit=5').then(r => r.json()),
      ])
      setBalance(balR)
      setFrauds(Array.isArray(fraudR) ? fraudR : [])
      setCoupons(Array.isArray(couR?.coupons) ? couR.coupons : [])
      setPromoCodes(Array.isArray(couR?.promoCodes) ? couR.promoCodes : [])
      setOverviewPayouts(Array.isArray(payR?.data) ? payR.data : Array.isArray(payR) ? payR : [])
      setOverviewDisputes(Array.isArray(dispR?.data) ? dispR.data : Array.isArray(dispR) ? dispR : [])
      setOverviewRefunds(Array.isArray(refR?.data) ? refR.data : Array.isArray(refR) ? refR : [])
      setOverviewCustomers(Array.isArray(custR?.data) ? custR.data : Array.isArray(custR) ? custR : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOverview() }, [loadOverview])

  async function runBackfill() {
    setBackfilling(true)
    setBackfillMsg('')
    try {
      const d = await fetch('/api/stripe/backfill', { method: 'POST' }).then(r => r.json())
      setBackfillMsg(`Backfill: ${d.payouts ?? 0} transferências, ${d.charges ?? 0} charges, ${d.disputes ?? 0} disputas, ${d.refunds ?? 0} reembolsos, ${d.customers ?? 0} clientes, ${d.payments_created ?? 0} pagamentos criados`)
      // Corrigir datas e nomes automaticamente após backfill
      await fetch('/api/stripe/backfill', { method: 'GET' })
      await loadOverview()
    } finally {
      setBackfilling(false)
    }
  }

  const actionFrauds = frauds.filter(f => f.actionable).length
  const openDisputes = overviewDisputes.filter(d => ['needs_response', 'warning_needs_response', 'under_review'].includes(d.status)).length

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
          <button onClick={loadOverview}
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
        <KpiCard label="Disputas abertas" value={String(openDisputes)}                          icon={Scale}           color={openDisputes > 0 ? 'text-ep-danger' : 'text-ep-muted'} loading={loading} />
        <KpiCard label="Alertas fraude"   value={String(actionFrauds)}                          icon={ShieldAlert}     color={actionFrauds > 0 ? 'text-ep-danger' : 'text-ep-muted'} loading={loading} />
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

      {tab === 'visao-geral'    && <OverviewTab balance={balance} payouts={overviewPayouts} frauds={frauds} disputes={overviewDisputes} refunds={overviewRefunds} customers={overviewCustomers} loading={loading} />}
      {tab === 'transferencias' && <PayoutsTab />}
      {tab === 'transacoes'     && <TransactionsTab />}
      {tab === 'reembolsos'     && <RefundsTab />}
      {tab === 'disputas'       && <DisputesTab />}
      {tab === 'cupoes'         && <CouponsTab coupons={coupons} promoCodes={promoCodes} loading={loading} onRefresh={loadOverview} />}
      {tab === 'clientes'       && <CustomersTab />}
      {tab === 'fraudes'        && <FraudsTab frauds={frauds} loading={loading} />}
      {tab === 'eventos'        && <EventsTab />}
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
            {payouts.length === 0 && <p className="text-ep-muted text-xs text-center py-6">Nenhuma transferência</p>}
            {payouts.map(p => {
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
            {disputes.length === 0 && <p className="text-ep-muted text-xs text-center py-6">Nenhuma disputa</p>}
            {disputes.map(d => {
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
            {refunds.length === 0 && <p className="text-ep-muted text-xs text-center py-6">Nenhum reembolso</p>}
            {refunds.map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                <div><p className="text-ep-primary text-xs font-medium">{formatEUR(r.amount)}</p><p className="text-ep-muted text-[11px]">{r.reason || '—'}</p></div>
                <Pill label={r.status} cls={r.status === 'succeeded' ? 'text-ep-success bg-ep-success/10 border-ep-success/20' : 'text-ep-warning bg-ep-warning/10 border-ep-warning/20'} />
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
                {f.actionable ? <Pill label="Accionável" cls="text-ep-danger bg-ep-danger/10 border-ep-danger/20" /> : <Pill label="Info" cls="text-ep-muted bg-ep-raised border-ep-border-default" />}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Clientes Recentes" icon={Users} cls="text-ep-accent">
        {loading ? <TableSkeleton rows={4} cols={3} /> : (
          <div className="divide-y divide-ep-border-subtle">
            {customers.length === 0 && <p className="text-ep-muted text-xs text-center py-6">Nenhum cliente</p>}
            {customers.map(c => (
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
              <span className={clsx('font-bold text-sm', balance && balance.available < 0 ? 'text-ep-danger' : 'text-ep-success')}>{balance ? formatEUR(balance.available) : '—'}</span>
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

// ─── PayoutsTab (paginado) ────────────────────────────────────────────────────

function PayoutsTab() {
  const [data,    setData]    = useState<Payout[]>([])
  const [page,    setPage]    = useState(1)
  const [pages,   setPages]   = useState(1)
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 20

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/stripe/payouts?page=${p}&limit=${LIMIT}`).then(r => r.json())
      const rows = Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []
      setData(rows)
      setPages(r.pages ?? 1)
      setTotal(r.total ?? (Array.isArray(r) ? r.length : 0))
      setPage(p)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(1) }, [load])

  const totalPaid = data.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-ep-border-subtle">
        {loading ? <TableSkeleton rows={5} cols={3} /> : data.length === 0 ? (
          <p className="text-ep-muted text-xs text-center py-8">Nenhuma transferência</p>
        ) : data.map(p => {
          const s = payoutCfg[p.status] ?? { label: p.status, cls: 'text-ep-muted bg-ep-raised border-ep-border-default' }
          return (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-ep-muted text-[11px] font-mono truncate">{p.id.slice(0, 16)}…</p>
                <p className="text-ep-secondary text-xs mt-0.5">{fmt(p.arrivalDate)}</p>
                {p.description && <p className="text-ep-muted text-[11px] truncate">{p.description}</p>}
              </div>
              <div className="flex-shrink-0 text-right space-y-1">
                <p className="text-ep-primary text-sm font-bold">{formatEUR(p.amount)}</p>
                <Pill label={s.label} cls={s.cls} />
              </div>
            </div>
          )
        })}
      </div>
      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto">
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
              {data.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhuma transferência</td></tr>}
              {data.map(p => {
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
      <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPage={load} />
    </div>
  )
}

// ─── TransactionsTab (paginado, lê do banco) ─────────────────────────────────

function TransactionsTab() {
  const [data,    setData]    = useState<BalanceTx[]>([])
  const [page,    setPage]    = useState(1)
  const [pages,   setPages]   = useState(1)
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all' | 'revenue'>('revenue')
  const LIMIT = 50

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/stripe/transactions?page=${p}&limit=${LIMIT}`).then(r => r.json())
      setData(Array.isArray(r.data) ? r.data : [])
      setPages(r.pages ?? 1)
      setTotal(r.total ?? 0)
      setPage(p)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(1) }, [load])

  const displayed  = filter === 'revenue' ? data.filter(t => REVENUE_TYPES.includes(t.type)) : data
  const revTxns    = data.filter(t => ['payment', 'charge'].includes(t.type))
  const totalGross = revTxns.reduce((s, t) => s + t.amount, 0)
  const totalFee   = revTxns.reduce((s, t) => s + t.fee, 0)
  const totalNet   = revTxns.reduce((s, t) => s + t.net, 0)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-3">
          <p className="text-ep-muted text-xs">Volume bruto (pagamentos)</p>
          <p className="text-ep-primary font-bold text-sm mt-1">{formatEUR(totalGross)}</p>
          <p className="text-ep-muted text-[11px] mt-0.5">≈ {eurToBrlStr(totalGross)}</p>
        </div>
        <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-3">
          <p className="text-ep-muted text-xs">Fees Stripe</p>
          <p className="text-ep-danger font-bold text-sm mt-1">-{formatEUR(totalFee)}</p>
          <p className="text-ep-muted text-[11px] mt-0.5">≈ -{eurToBrlStr(totalFee)}</p>
        </div>
        <div className="bg-ep-surface border border-ep-border-subtle rounded-lg p-3">
          <p className="text-ep-muted text-xs">Líquido</p>
          <p className="text-ep-success font-bold text-sm mt-1">{formatEUR(totalNet)}</p>
          <p className="text-ep-muted text-[11px] mt-0.5">≈ {eurToBrlStr(totalNet)}</p>
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
          Todas ({data.length})
        </button>
      </div>
      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-ep-border-subtle">
          {loading ? <TableSkeleton rows={6} cols={3} /> : displayed.length === 0 ? (
            <p className="text-ep-muted text-xs text-center py-8">Nenhuma transação</p>
          ) : displayed.map(t => (
            <div key={t.id} className="px-4 py-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ep-secondary text-xs font-mono truncate">{t.type}</span>
                <Pill label={t.status} cls={t.status === 'available' ? 'text-ep-success bg-ep-success/10 border-ep-success/20' : 'text-ep-warning bg-ep-warning/10 border-ep-warning/20'} />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-ep-muted text-[11px]">Bruto</p>
                  <p className={clsx('text-xs font-medium', t.amount >= 0 ? 'text-ep-primary' : 'text-ep-danger')}>{formatEUR(t.amount)}</p>
                  <p className="text-ep-muted text-[11px]">≈ {eurToBrlStr(t.amount)}</p>
                </div>
                {t.fee > 0 && (
                  <div>
                    <p className="text-ep-muted text-[11px]">Fee</p>
                    <p className="text-ep-danger text-xs">-{formatEUR(t.fee)}</p>
                    <p className="text-ep-muted text-[11px]">≈ -{eurToBrlStr(t.fee)}</p>
                  </div>
                )}
                <div>
                  <p className="text-ep-muted text-[11px]">Líquido</p>
                  <p className={clsx('text-xs font-medium', t.net >= 0 ? 'text-ep-success' : 'text-ep-danger')}>{formatEUR(t.net)}</p>
                  <p className="text-ep-muted text-[11px]">≈ {eurToBrlStr(t.net)}</p>
                </div>
              </div>
              <p className="text-ep-muted text-[11px]">{fmt(t.createdAt)}</p>
            </div>
          ))}
        </div>
        {/* Desktop: tabela */}
        <div className="hidden md:block overflow-x-auto">
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
                    <td className="px-4 py-2.5">
                      <p className={clsx('font-medium', t.amount >= 0 ? 'text-ep-primary' : 'text-ep-danger')}>{formatEUR(t.amount)}</p>
                      <p className="text-ep-muted text-[11px]">≈ {eurToBrlStr(t.amount)}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      {t.fee > 0 ? (
                        <>
                          <p className="text-ep-danger">-{formatEUR(t.fee)}</p>
                          <p className="text-ep-muted text-[11px]">≈ -{eurToBrlStr(t.fee)}</p>
                        </>
                      ) : <span className="text-ep-muted">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className={clsx('font-medium', t.net >= 0 ? 'text-ep-success' : 'text-ep-danger')}>{formatEUR(t.net)}</p>
                      <p className="text-ep-muted text-[11px]">≈ {eurToBrlStr(t.net)}</p>
                    </td>
                    <td className="px-4 py-2.5"><Pill label={t.status} cls={t.status === 'available' ? 'text-ep-success bg-ep-success/10 border-ep-success/20' : 'text-ep-warning bg-ep-warning/10 border-ep-warning/20'} /></td>
                    <td className="px-4 py-2.5 text-ep-muted">{fmt(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPage={load} />
      </div>
    </div>
  )
}

// ─── RefundsTab (paginado) ────────────────────────────────────────────────────

function RefundsTab() {
  const [data, setData] = useState<StripeRefund[]>([])
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 20

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/stripe/refunds?page=${p}&limit=${LIMIT}`).then(r => r.json())
      const rows = Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []
      setData(rows); setPages(r.pages ?? 1); setTotal(r.total ?? (Array.isArray(r) ? r.length : 0)); setPage(p)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(1) }, [load])

  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-ep-border-subtle">
        {loading ? <TableSkeleton rows={5} cols={3} /> : data.length === 0 ? (
          <p className="text-ep-muted text-xs text-center py-8">Nenhum reembolso</p>
        ) : data.map(r => (
          <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-ep-muted text-[11px] font-mono truncate">{r.id.slice(0, 16)}…</p>
              <p className="text-ep-muted text-xs mt-0.5">{r.reason || '—'}</p>
              <p className="text-ep-muted text-[11px]">{fmt(r.createdAt)}</p>
            </div>
            <div className="flex-shrink-0 text-right space-y-1">
              <p className="text-ep-primary text-sm font-bold">{formatEUR(r.amount)}</p>
              <Pill label={r.status} cls={r.status === 'succeeded' ? 'text-ep-success bg-ep-success/10 border-ep-success/20' : 'text-ep-warning bg-ep-warning/10 border-ep-warning/20'} />
            </div>
          </div>
        ))}
      </div>
      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto">
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
              {data.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhum reembolso</td></tr>}
              {data.map(r => (
                <tr key={r.id} className="hover:bg-ep-raised/50 transition-colors">
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{r.id.slice(0, 16)}…</td>
                  <td className="px-4 py-2.5 text-ep-primary font-medium">{formatEUR(r.amount)}</td>
                  <td className="px-4 py-2.5"><Pill label={r.status} cls={r.status === 'succeeded' ? 'text-ep-success bg-ep-success/10 border-ep-success/20' : 'text-ep-warning bg-ep-warning/10 border-ep-warning/20'} /></td>
                  <td className="px-4 py-2.5 text-ep-muted">{r.reason || '—'}</td>
                  <td className="px-4 py-2.5 text-ep-secondary">{fmt(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPage={load} />
    </div>
  )
}

// ─── DisputesTab (paginado) ───────────────────────────────────────────────────

function DisputesTab() {
  const [data, setData] = useState<StripeDispute[]>([])
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 20

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/stripe/disputes?page=${p}&limit=${LIMIT}`).then(r => r.json())
      const rows = Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []
      setData(rows); setPages(r.pages ?? 1); setTotal(r.total ?? (Array.isArray(r) ? r.length : 0)); setPage(p)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(1) }, [load])

  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-ep-border-subtle">
        {loading ? <TableSkeleton rows={5} cols={3} /> : data.length === 0 ? (
          <p className="text-ep-muted text-xs text-center py-8">Nenhuma disputa</p>
        ) : data.map(d => {
          const s = disputeCfg[d.status] ?? { label: d.status, cls: 'text-ep-muted bg-ep-raised border-ep-border-default' }
          return (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-ep-muted text-[11px] font-mono truncate">{d.id.slice(0, 16)}…</p>
                <p className="text-ep-secondary text-xs mt-0.5">{d.reason}</p>
                {d.evidenceDueBy && <p className="text-ep-warning text-[11px]">Prazo: {fmt(d.evidenceDueBy)}</p>}
              </div>
              <div className="flex-shrink-0 text-right space-y-1">
                <p className="text-ep-primary text-sm font-bold">{formatEUR(d.amount)}</p>
                <Pill label={s.label} cls={s.cls} />
              </div>
            </div>
          )
        })}
      </div>
      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto">
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
              {data.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhuma disputa</td></tr>}
              {data.map(d => {
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
      <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPage={load} />
    </div>
  )
}

// ─── EventsTab (paginado) ─────────────────────────────────────────────────────

function EventsTab() {
  const [data, setData] = useState<StripeEvent[]>([])
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 30

  const load = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const r = await fetch(`/api/stripe/events?page=${p}&limit=${LIMIT}`).then(r => r.json())
      setData(Array.isArray(r.data) ? r.data : []); setPages(r.pages ?? 1); setTotal(r.total ?? 0); setPage(p)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(1) }, [load])

  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-ep-border-subtle">
        {loading ? <TableSkeleton rows={6} cols={3} /> : data.length === 0 ? (
          <p className="text-ep-muted text-xs text-center py-8">Nenhum evento</p>
        ) : data.map(e => (
          <div key={e.id} className="px-4 py-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ep-primary text-xs font-mono truncate">{e.type}</span>
              {e.livemode ? <Pill label="Live" cls="text-ep-success bg-ep-success/10 border-ep-success/20" /> : <Pill label="Test" cls="text-ep-warning bg-ep-warning/10 border-ep-warning/20" />}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-ep-muted text-[11px] font-mono truncate">{e.id.slice(0, 20)}…</p>
              {e.error ? <Pill label="Erro" cls="text-ep-danger bg-ep-danger/10 border-ep-danger/20" />
                : e.processed ? <Pill label="OK" cls="text-ep-success bg-ep-success/10 border-ep-success/20" />
                : <Pill label="Pendente" cls="text-ep-warning bg-ep-warning/10 border-ep-warning/20" />}
            </div>
            <p className="text-ep-muted text-[11px]">{fmt(e.receivedAt)}</p>
          </div>
        ))}
      </div>
      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto">
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
              {data.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhum evento</td></tr>}
              {data.map(e => (
                <tr key={e.id} className="hover:bg-ep-raised/50 transition-colors">
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{e.id.slice(0, 16)}…</td>
                  <td className="px-4 py-2.5 text-ep-primary font-mono">{e.type}</td>
                  <td className="px-4 py-2.5">{e.livemode ? <Pill label="Live" cls="text-ep-success bg-ep-success/10 border-ep-success/20" /> : <Pill label="Test" cls="text-ep-warning bg-ep-warning/10 border-ep-warning/20" />}</td>
                  <td className="px-4 py-2.5">
                    {e.error ? <Pill label="Erro" cls="text-ep-danger bg-ep-danger/10 border-ep-danger/20" />
                      : e.processed ? <Pill label="Processado" cls="text-ep-success bg-ep-success/10 border-ep-success/20" />
                      : <Pill label="Pendente" cls="text-ep-warning bg-ep-warning/10 border-ep-warning/20" />}
                  </td>
                  <td className="px-4 py-2.5 text-ep-muted">{fmt(e.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPage={load} />
    </div>
  )
}

// ─── CouponsTab ───────────────────────────────────────────────────────────────

function CouponsTab({ coupons, promoCodes, loading, onRefresh }: {
  coupons: StripeCoupon[]; promoCodes: StripePromoCode[]; loading: boolean; onRefresh: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'percent' as 'percent' | 'amount', value: '', currency: 'EUR', duration: 'once', promoCode: '' })

  async function createCoupon() {
    if (!form.name || !form.value) return
    setCreating(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        duration: form.duration,
        ...(form.type === 'percent'
          ? { percent_off: Number(form.value) }
          : { amount_off: Math.round(Number(form.value) * 100), currency: form.currency }),
        ...(form.promoCode ? { promo_code: form.promoCode } : {}),
      }
      await fetch('/api/stripe/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setShowModal(false)
      setForm({ name: '', type: 'percent', value: '', currency: 'EUR', duration: 'once', promoCode: '' })
      onRefresh()
    } finally { setCreating(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-ep-secondary text-xs">{coupons.length} cupões</span>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-ep-accent text-ep-base hover:bg-ep-accent/90 transition-colors">
          <Plus size={13} />Novo cupão
        </button>
      </div>

      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        {/* Mobile: cards cupões */}
        <div className="md:hidden divide-y divide-ep-border-subtle">
          {loading ? <TableSkeleton rows={4} cols={3} /> : coupons.length === 0 ? (
            <p className="text-ep-muted text-xs text-center py-8">Nenhum cupão</p>
          ) : coupons.map(c => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-ep-primary text-sm font-medium truncate">{c.name || c.id}</p>
                <p className="text-ep-secondary text-xs">{c.percentOff != null ? `${c.percentOff}% off` : c.amountOff != null ? formatEUR(c.amountOff) + ' off' : '—'} · {c.duration} · {c.timesRedeemed} usos</p>
                <p className="text-ep-muted text-[11px]">{fmt(c.createdAt)}</p>
              </div>
              {c.valid
                ? <Pill label="Ativo" cls="text-ep-success bg-ep-success/10 border-ep-success/20" />
                : <Pill label="Inativo" cls="text-ep-muted bg-ep-raised border-ep-border-default" />}
            </div>
          ))}
        </div>
        {/* Desktop: tabela cupões */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? <TableSkeleton rows={5} cols={6} /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-ep-border-subtle">
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Nome</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Desconto</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Duração</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Usos</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Estado</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Criado</th>
              </tr></thead>
              <tbody className="divide-y divide-ep-border-subtle">
                {coupons.length === 0 && <tr><td colSpan={6} className="text-center text-ep-muted py-8">Nenhum cupão</td></tr>}
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5 text-ep-primary font-medium">{c.name || c.id}</td>
                    <td className="px-4 py-2.5 text-ep-primary">
                      {c.percentOff != null ? `${c.percentOff}%` : c.amountOff != null ? formatEUR(c.amountOff) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-ep-secondary capitalize">{c.duration}</td>
                    <td className="px-4 py-2.5 text-ep-secondary">{c.timesRedeemed}</td>
                    <td className="px-4 py-2.5">
                      {c.valid
                        ? <Pill label="Ativo" cls="text-ep-success bg-ep-success/10 border-ep-success/20" />
                        : <Pill label="Inativo" cls="text-ep-muted bg-ep-raised border-ep-border-default" />}
                    </td>
                    <td className="px-4 py-2.5 text-ep-muted">{fmt(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {promoCodes.length > 0 && (
        <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-ep-border-subtle">
            <span className="text-ep-primary text-sm font-medium">Códigos promocionais</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-ep-border-subtle">
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Código</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Cupão</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Usos</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Estado</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Expira</th>
              </tr></thead>
              <tbody className="divide-y divide-ep-border-subtle">
                {promoCodes.map(p => (
                  <tr key={p.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5 text-ep-primary font-mono font-medium">{p.code}</td>
                    <td className="px-4 py-2.5 text-ep-muted font-mono">{p.couponId.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5 text-ep-secondary">{p.timesRedeemed}{p.maxRedemptions ? ` / ${p.maxRedemptions}` : ''}</td>
                    <td className="px-4 py-2.5">
                      {p.active
                        ? <Pill label="Ativo" cls="text-ep-success bg-ep-success/10 border-ep-success/20" />
                        : <Pill label="Inativo" cls="text-ep-muted bg-ep-raised border-ep-border-default" />}
                    </td>
                    <td className="px-4 py-2.5 text-ep-muted">{p.expiresAt ? fmt(p.expiresAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-ep-surface border border-ep-border-subtle rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-ep-primary font-semibold text-sm">Novo cupão</h2>
            <div className="space-y-3">
              <div>
                <label className="text-ep-secondary text-xs mb-1 block">Nome</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-ep-raised border border-ep-border-default rounded-md px-3 py-2 text-xs text-ep-primary focus:outline-none focus:border-ep-accent" placeholder="Ex: PROMO10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-ep-secondary text-xs mb-1 block">Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percent' | 'amount' }))}
                    className="w-full bg-ep-raised border border-ep-border-default rounded-md px-3 py-2 text-xs text-ep-primary focus:outline-none focus:border-ep-accent">
                    <option value="percent">Percentagem</option>
                    <option value="amount">Valor fixo</option>
                  </select>
                </div>
                <div>
                  <label className="text-ep-secondary text-xs mb-1 block">{form.type === 'percent' ? 'Percentagem (%)' : 'Valor (€)'}</label>
                  <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full bg-ep-raised border border-ep-border-default rounded-md px-3 py-2 text-xs text-ep-primary focus:outline-none focus:border-ep-accent" placeholder={form.type === 'percent' ? '10' : '5.00'} />
                </div>
              </div>
              <div>
                <label className="text-ep-secondary text-xs mb-1 block">Duração</label>
                <select value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full bg-ep-raised border border-ep-border-default rounded-md px-3 py-2 text-xs text-ep-primary focus:outline-none focus:border-ep-accent">
                  <option value="once">Uma vez</option>
                  <option value="repeating">Repetido</option>
                  <option value="forever">Sempre</option>
                </select>
              </div>
              <div>
                <label className="text-ep-secondary text-xs mb-1 block">Código promocional (opcional)</label>
                <input value={form.promoCode} onChange={e => setForm(f => ({ ...f, promoCode: e.target.value }))}
                  className="w-full bg-ep-raised border border-ep-border-default rounded-md px-3 py-2 text-xs text-ep-primary focus:outline-none focus:border-ep-accent" placeholder="Ex: VERAO2025" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-3 py-2 rounded-md text-xs font-medium border border-ep-border-default text-ep-secondary hover:text-ep-primary transition-colors">
                Cancelar
              </button>
              <button onClick={createCoupon} disabled={creating || !form.name || !form.value}
                className="flex-1 px-3 py-2 rounded-md text-xs font-medium bg-ep-accent text-ep-base hover:bg-ep-accent/90 transition-colors disabled:opacity-50">
                {creating ? 'Criando…' : 'Criar cupão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CustomersTab (paginado + pesquisa) ───────────────────────────────────────

function CustomersTab() {
  const [data, setData] = useState<StripeCustomer[]>([])
  const [page, setPage] = useState(1); const [pages, setPages] = useState(1); const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const LIMIT = 20

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (q) params.set('search', q)
      const r = await fetch(`/api/stripe/customers?${params}`).then(r => r.json())
      setData(Array.isArray(r.data) ? r.data : []); setPages(r.pages ?? 1); setTotal(r.total ?? 0); setPage(p)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(1, search) }, [load, search])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted" />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            className="w-full bg-ep-raised border border-ep-border-default rounded-md pl-8 pr-3 py-2 text-xs text-ep-primary focus:outline-none focus:border-ep-accent"
            placeholder="Pesquisar por nome ou email…" />
        </div>
        <button type="submit" className="px-3 py-2 rounded-md text-xs font-medium bg-ep-raised border border-ep-border-default text-ep-secondary hover:text-ep-primary transition-colors">
          Pesquisar
        </button>
      </form>

      <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-ep-border-subtle">
          {loading ? <TableSkeleton rows={6} cols={3} /> : data.length === 0 ? (
            <p className="text-ep-muted text-xs text-center py-8">Nenhum cliente</p>
          ) : data.map(c => (
            <div key={c.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-ep-accent/20 border border-ep-accent/30 flex items-center justify-center flex-shrink-0">
                <span className="text-ep-accent text-xs font-bold">{(c.name || c.email || '?')[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-ep-primary text-sm font-medium truncate">{c.name || '—'}</p>
                <p className="text-ep-muted text-xs truncate">{c.email || '—'}</p>
                {c.phone && <p className="text-ep-muted text-[11px]">{c.phone}</p>}
              </div>
              <p className="text-ep-muted text-[11px] flex-shrink-0">{fmt(c.createdAt)}</p>
            </div>
          ))}
        </div>
        {/* Desktop: tabela */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? <TableSkeleton rows={10} cols={4} /> : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-ep-border-subtle">
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Nome</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Email</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Telefone</th>
                <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Criado</th>
              </tr></thead>
              <tbody className="divide-y divide-ep-border-subtle">
                {data.length === 0 && <tr><td colSpan={4} className="text-center text-ep-muted py-8">Nenhum cliente</td></tr>}
                {data.map(c => (
                  <tr key={c.id} className="hover:bg-ep-raised/50 transition-colors">
                    <td className="px-4 py-2.5 text-ep-primary font-medium">{c.name || '—'}</td>
                    <td className="px-4 py-2.5 text-ep-secondary">{c.email || '—'}</td>
                    <td className="px-4 py-2.5 text-ep-muted">{c.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-ep-muted">{fmt(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPage={p => load(p, search)} />
      </div>
    </div>
  )
}

// ─── FraudsTab ────────────────────────────────────────────────────────────────

function FraudsTab({ frauds, loading }: { frauds: FraudWarning[]; loading: boolean }) {
  return (
    <div className="bg-ep-surface border border-ep-border-subtle rounded-lg overflow-hidden">
      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-ep-border-subtle">
        {loading ? <TableSkeleton rows={4} cols={3} /> : frauds.length === 0 ? (
          <p className="text-ep-muted text-xs text-center py-8">Nenhum alerta de fraude</p>
        ) : frauds.map(f => (
          <div key={f.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-ep-secondary text-xs capitalize">{f.fraudType.replace(/_/g, ' ')}</p>
              <p className="text-ep-muted text-[11px] font-mono truncate">{f.paymentIntentId ? f.paymentIntentId.slice(0, 20) + '…' : '—'}</p>
              <p className="text-ep-muted text-[11px]">{fmt(f.createdAt)}</p>
            </div>
            {f.actionable
              ? <Pill label="Acionável" cls="text-ep-danger bg-ep-danger/10 border-ep-danger/20" />
              : <Pill label="Info" cls="text-ep-muted bg-ep-raised border-ep-border-default" />}
          </div>
        ))}
      </div>
      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto">
        {loading ? <TableSkeleton rows={5} cols={5} /> : (
          <table className="w-full text-xs">
            <thead><tr className="border-b border-ep-border-subtle">
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">ID</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Payment Intent</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Tipo</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Acionável</th>
              <th className="text-left px-4 py-2.5 text-ep-muted font-medium">Data</th>
            </tr></thead>
            <tbody className="divide-y divide-ep-border-subtle">
              {frauds.length === 0 && <tr><td colSpan={5} className="text-center text-ep-muted py-8">Nenhum alerta de fraude</td></tr>}
              {frauds.map(f => (
                <tr key={f.id} className="hover:bg-ep-raised/50 transition-colors">
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{f.id.slice(0, 16)}…</td>
                  <td className="px-4 py-2.5 text-ep-muted font-mono">{f.paymentIntentId ? f.paymentIntentId.slice(0, 16) + '…' : '—'}</td>
                  <td className="px-4 py-2.5 text-ep-secondary capitalize">{f.fraudType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-2.5">
                    {f.actionable
                      ? <Pill label="Sim" cls="text-ep-danger bg-ep-danger/10 border-ep-danger/20" />
                      : <Pill label="Não" cls="text-ep-muted bg-ep-raised border-ep-border-default" />}
                  </td>
                  <td className="px-4 py-2.5 text-ep-muted">{fmt(f.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
