'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface StatusChartProps {
  vendas: number
  falhas: number
  pendentes: number
  reembolsos: number
}

const COLORS = ['#aaff00', '#ff4444', '#ffaa00', '#4488ff']

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-ep-raised border border-ep-border-default rounded-lg px-3 py-2 shadow-xl">
      <p className="text-ep-primary text-xs font-semibold">{payload[0].name}</p>
      <p className="text-ep-secondary text-xs">{payload[0].value} pagamentos</p>
    </div>
  )
}

export default function StatusChart({ vendas, falhas, pendentes, reembolsos }: StatusChartProps) {
  const data = [
    { name: 'Aprovados',  value: vendas     },
    { name: 'Falhas',     value: falhas     },
    { name: 'Pendentes',  value: pendentes  },
    { name: 'Reembolsos', value: reembolsos },
  ]
  const total = vendas + falhas + pendentes + reembolsos

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 h-full">
      <div className="mb-4">
        <h3 className="text-ep-primary font-semibold text-md">Distribuição de Status</h3>
        <p className="text-ep-secondary text-xs mt-0.5">Total: {total} pagamentos</p>
      </div>

      {/* Donut + legenda: lado a lado no md, empilhado no sm */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-[120px] h-[120px] md:w-[130px] md:h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="58%"
                outerRadius="80%"
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2">
          {data.map((entry, i) => (
            <div key={entry.name} className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-ep-secondary text-xs truncate">{entry.name}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-ep-primary text-xs font-semibold">{entry.value}</span>
                <span className="text-ep-muted text-xs w-8 text-right">
                  {total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
