'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, CreditCard, CheckCircle,
  XCircle, Percent, Receipt,
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

export default function DashboardPage() {
  const [preset,      setPreset]      = useState<DatePreset>('hoje')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [data,        setData]        = useState<DashboardData | null>(null)
  const [loading,     setLoading]     = useState(true)

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
