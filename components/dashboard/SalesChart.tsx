'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DailySale } from '@/lib/types/dashboard'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-ep-raised border border-ep-border-default rounded-lg p-3 shadow-xl">
      <p className="text-ep-secondary text-xs mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-ep-secondary capitalize">{entry.name}:</span>
          <span className="text-ep-primary font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

interface SalesChartProps {
  data: DailySale[]
}

export default function SalesChart({ data }: SalesChartProps) {
  const interval = data.length <= 7 ? 0 : data.length <= 15 ? 1 : 4

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5">
      <div className="flex items-center justify-between mb-4 md:mb-6 gap-2 flex-wrap">
        <div>
          <h3 className="text-ep-primary font-semibold text-md">Vendas por Dia</h3>
          <p className="text-ep-secondary text-xs mt-0.5">
            {data.length} dia{data.length !== 1 ? 's' : ''} selecionado{data.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-ep-accent" />
            <span className="text-ep-secondary">Vendas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-ep-danger" />
            <span className="text-ep-secondary">Falhas</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="30%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#666666', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={interval}
          />
          <YAxis
            tick={{ fill: '#666666', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="vendas" fill="#aaff00" radius={[3, 3, 0, 0]} maxBarSize={16} />
          <Bar dataKey="falhas" fill="#ff4444" radius={[3, 3, 0, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
