'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, CreditCard, CheckCircle,
  XCircle, Percent, Receipt, Wallet,
} from 'lucide-react'
import StatsCard      from '@/components/dashboard/StatsCard'
import SalesChart     from '@/components/dashboard/SalesChart'
import StatusChart    from '@/components/dashboard/StatusChart'
import RecentPayments from '@/components/dashboard/RecentPayments'
import DateFilter, { getRange } from '@/components/ui/DateFilter'
import type { DatePreset } from '@/components/ui/DateFilter'
import type { DailySale, DashboardStats } from '@/lib/types/dashboard'
import type { Payment } from '@/lib/types/payment'
import { formatEUR, eurToBrlStr } from '@/lib/utils/currency'

interface DashboardData {
  stats:    DashboardStats
  sales:    DailySale[]
  payments: Payment[]
}

interface StripeBalance {
  available: number
  pending:   number
  currency:  string
  cached?:   boolean
}

export default function DashboardPage() {
  const [preset,      setPreset]      = useState<DatePreset>('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [data,        setData]        = useState<DashboardData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [balance,     setBalance]     = useState<StripeBalance | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  const range = getRange(preset, customStart, customEnd)

  const fetchData = useCallback(async (start: string, end: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?start=${start}&end=${end}`)
      const json = await res.json() as DashboardData
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(range.start, range.end)
  }, [range.start, range.end, fetchData])

  useEffect(() => {
    setBalanceLoading(true)
    fetch('/api/stripe/balance')
      .then(r => r.json())
      .then((b: StripeBalance) => setBalance(b))
      .catch(() => { /* ignorar */ })
      .finally(() => setBalanceLoading(false))
  }, [])

  const handleDateChange = (p: DatePreset, cs?: string, ce?: string) => {
    setPreset(p)
    if (cs) setCustomStart(cs)
    if (ce) setCustomEnd(ce)
  }

  const stats    = data?.stats
  const sales    = data?.sales    ?? []
  const payments = data?.payments ?? []

  const pendentes  = stats?.pendentes  ?? 0
  const reembolsos = stats?.reembolsos ?? 0

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Dashboard</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            {loading
              ? 'Carregando…'
              : `${sales.length} dia${sales.length !== 1 ? 's' : ''} no período`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateFilter preset={preset} customStart={customStart} customEnd={customEnd} onChange={handleDateChange} compact />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ep-success/10 border border-ep-success/20 text-ep-success text-xs font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-ep-success animate-pulse" />
            Stripe Conectado
          </span>
        </div>
      </div>

      {/* Stats — 2 no mobile, 3 no md/xl, 6 no 2xl */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 md:gap-4">
        <StatsCard
          title="Receita Total"
          value={formatEUR(stats?.receitaTotal ?? 0)}
          subValue={eurToBrlStr(stats?.receitaTotal ?? 0)}
          change={stats?.receitaChange} changeLabel="vs período ant."
          icon={DollarSign} accent="default" loading={loading}
        />
        <StatsCard
          title="Total Pagamentos"
          value={(stats?.totalPagamentos ?? 0).toLocaleString('pt-PT')}
          change={stats?.vendasChange} changeLabel="vs período ant."
          icon={CreditCard} accent="info" loading={loading}
        />
        <StatsCard
          title="Vendas Aprovadas"
          value={(stats?.vendas ?? 0).toLocaleString('pt-PT')}
          change={stats?.vendasChange} changeLabel="vs período ant."
          icon={CheckCircle} accent="success" loading={loading}
        />
        <StatsCard
          title="Falhas"
          value={(stats?.falhas ?? 0).toLocaleString('pt-PT')}
          change={stats?.falhasChange} changeLabel="vs período ant."
          icon={XCircle} accent="danger" loading={loading}
        />
        <StatsCard
          title="Taxa de Conversão"
          value={`${stats?.taxaConversao ?? 0}%`}
          change={stats?.conversaoChange} changeLabel="vs período ant."
          icon={Percent} accent="warning" loading={loading}
        />
        <StatsCard
          title="Ticket Médio"
          value={formatEUR(stats?.ticketMedio ?? 0)}
          subValue={eurToBrlStr(stats?.ticketMedio ?? 0)}
          change={stats?.ticketChange} changeLabel="vs período ant."
          icon={Receipt} accent="default" loading={loading}
        />
      </div>

      {/* Stripe Balance Widget */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={15} className="text-ep-accent" />
          <p className="text-ep-primary text-sm font-semibold">Saldo Stripe</p>
          {balance?.cached && <span className="text-ep-muted text-xs">(cache)</span>}
        </div>
        {balanceLoading ? (
          <div className="flex gap-6 animate-pulse">
            <div className="h-8 w-28 bg-ep-raised rounded" />
            <div className="h-8 w-28 bg-ep-raised rounded" />
          </div>
        ) : balance && !('error' in balance) ? (
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-ep-muted text-xs mb-0.5">Disponível</p>
              <p className="text-ep-success text-xl font-bold">{formatEUR(balance.available)}</p>
            </div>
            <div>
              <p className="text-ep-muted text-xs mb-0.5">Pendente</p>
              <p className="text-ep-warning text-xl font-bold">{formatEUR(balance.pending)}</p>
            </div>
          </div>
        ) : (
          <p className="text-ep-muted text-sm">Não foi possível carregar o saldo.</p>
        )}
      </div>

      {/* Charts — sempre visíveis, com zeros se não houver dados */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 md:gap-4">
        <div className="xl:col-span-2">
          <SalesChart data={sales} />
        </div>
        <div>
          <StatusChart
            vendas={stats?.vendas ?? 0}
            falhas={stats?.falhas ?? 0}
            pendentes={pendentes}
            reembolsos={reembolsos}
          />
        </div>
      </div>

      <RecentPayments payments={payments.slice(0, 15)} />
    </div>
  )
}
