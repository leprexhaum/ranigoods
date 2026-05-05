'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
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
  const [preset,      setPreset]      = useState<DatePreset>('30d')
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
              : sales.length > 0
              ? `${sales.length} dia${sales.length > 1 ? 's' : ''} de dados`
              : 'Nenhum dado no período'}
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
          value={stats ? formatEUR(stats.receitaTotal) : '—'}
          subValue={stats ? eurToBrlStr(stats.receitaTotal) : undefined}
          change={stats?.receitaChange} changeLabel="vs período ant."
          icon={DollarSign} accent="default"
        />
        <StatsCard
          title="Total Pagamentos"
          value={stats ? stats.totalPagamentos.toLocaleString('pt-PT') : '—'}
          change={stats?.vendasChange} changeLabel="vs período ant."
          icon={CreditCard} accent="info"
        />
        <StatsCard
          title="Vendas Aprovadas"
          value={stats ? stats.vendas.toLocaleString('pt-PT') : '—'}
          change={stats?.vendasChange} changeLabel="vs período ant."
          icon={CheckCircle} accent="success"
        />
        <StatsCard
          title="Falhas"
          value={stats ? stats.falhas.toLocaleString('pt-PT') : '—'}
          change={stats?.falhasChange} changeLabel="vs período ant."
          icon={XCircle} accent="danger"
        />
        <StatsCard
          title="Taxa de Conversão"
          value={stats ? `${stats.taxaConversao}%` : '—'}
          change={stats?.conversaoChange} changeLabel="vs período ant."
          icon={Percent} accent="warning"
        />
        <StatsCard
          title="Ticket Médio"
          value={stats ? formatEUR(stats.ticketMedio) : '—'}
          subValue={stats ? eurToBrlStr(stats.ticketMedio) : undefined}
          change={stats?.ticketChange} changeLabel="vs período ant."
          icon={Receipt} accent="default"
        />
      </div>

      {!loading && sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-ep-surface border border-ep-border-subtle rounded-lg gap-4">
          <Image
            src="/cartaoflutuante.png"
            alt="Sem dados"
            width={180}
            height={135}
            className="opacity-90"
          />
          <div className="text-center">
            <p className="text-ep-primary text-sm font-medium">Nenhum dado encontrado</p>
            <p className="text-ep-muted text-xs mt-1">Tente selecionar outro período no filtro de datas</p>
          </div>
        </div>
      ) : (
        <>
          {/* Charts */}
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
        </>
      )}
    </div>
  )
}
