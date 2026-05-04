'use client'

import { useState } from 'react'
import { Package, Plus, ExternalLink, MoreVertical } from 'lucide-react'
import clsx from 'clsx'
import DateFilter, { getRange } from '@/components/ui/DateFilter'
import type { DatePreset } from '@/components/ui/DateFilter'

interface Product {
  id: string
  name: string
  price: number
  interval: string
  sales: number
  revenue: number
  status: 'active' | 'archived'
  stripeId: string
}

const mockProducts: Product[] = [
  { id: '1', name: 'Plano Starter',    price: 4990,  interval: 'mês',  sales: 312, revenue: 155688000, status: 'active',   stripeId: 'prod_starter' },
  { id: '2', name: 'Plano Pro',        price: 9990,  interval: 'mês',  sales: 524, revenue: 523476000, status: 'active',   stripeId: 'prod_pro' },
  { id: '3', name: 'Plano Business',   price: 19990, interval: 'mês',  sales: 198, revenue: 395800200, status: 'active',   stripeId: 'prod_biz' },
  { id: '4', name: 'Plano Enterprise', price: 49990, interval: 'mês',  sales: 47,  revenue: 234953000, status: 'active',   stripeId: 'prod_ent' },
  { id: '5', name: 'Add-on Analytics', price: 2990,  interval: 'mês',  sales: 89,  revenue: 26611000,  status: 'active',   stripeId: 'prod_analytics' },
  { id: '6', name: 'Add-on Pixels',    price: 1990,  interval: 'mês',  sales: 156, revenue: 31044000,  status: 'active',   stripeId: 'prod_pixels' },
  { id: '7', name: 'Créditos Extras',  price: 9900,  interval: 'unit', sales: 43,  revenue: 425700,    status: 'archived', stripeId: 'prod_credits' },
]

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

const periodMultiplier: Record<string, number> = {
  hoje: 1 / 30,
  ontem: 1 / 30,
  '7d': 7 / 30,
  '15d': 0.5,
  '30d': 1,
  max: 3,
  custom: 1,
}

export default function ProdutosPage() {
  const [filter,      setFilter]      = useState<'all' | 'active' | 'archived'>('all')
  const [preset,      setPreset]      = useState<DatePreset>('30d')
  const [customStart, setCustomStart] = useState('2026-04-04')
  const [customEnd,   setCustomEnd]   = useState('2026-05-04')

  const handleDateChange = (p: DatePreset, cs?: string, ce?: string) => {
    setPreset(p)
    if (cs) setCustomStart(cs)
    if (ce) setCustomEnd(ce)
  }

  const mult = periodMultiplier[preset] ?? 1
  const filtered = mockProducts.filter((p) => filter === 'all' || p.status === filter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Produtos</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            Gerencie seus produtos e preços do Stripe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateFilter
            preset={preset}
            customStart={customStart}
            customEnd={customEnd}
            onChange={handleDateChange}
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-ep-accent text-ep-base rounded-md text-sm font-semibold hover:bg-ep-accent-dark transition-colors">
            <Plus size={14} strokeWidth={2.5} />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1 w-fit">
        {(['all', 'active', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'px-3 py-1.5 rounded text-xs font-medium transition-all capitalize',
              filter === f
                ? 'bg-ep-accent text-ep-base font-semibold'
                : 'text-ep-secondary hover:text-ep-primary'
            )}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Arquivados'}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="bg-ep-surface border border-ep-border-default rounded-lg p-5 hover:border-ep-accent/30 transition-colors group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-ep-accent/10 border border-ep-accent/20 flex items-center justify-center flex-shrink-0">
                  <Package size={16} className="text-ep-accent" />
                </div>
                <div>
                  <h3 className="text-ep-primary text-sm font-semibold">{product.name}</h3>
                  <p className="text-ep-muted text-xs font-mono">{product.stripeId}</p>
                </div>
              </div>
              <button className="text-ep-muted hover:text-ep-primary transition-colors opacity-0 group-hover:opacity-100">
                <MoreVertical size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-ep-secondary text-xs">Preço</span>
                <span className="text-ep-primary text-sm font-bold">
                  {formatBRL(product.price)}<span className="text-ep-muted font-normal text-xs">/{product.interval}</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ep-secondary text-xs">Vendas</span>
                <span className="text-ep-primary text-sm font-semibold">{product.sales.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ep-secondary text-xs">Receita no período</span>
                <span className="text-ep-accent text-sm font-semibold">{formatBRL(Math.round(product.revenue * mult))}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-ep-border-subtle flex items-center justify-between">
              <span
                className={clsx(
                  'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border',
                  product.status === 'active'
                    ? 'text-ep-success bg-ep-success/10 border-ep-success/20'
                    : 'text-ep-muted bg-ep-overlay/50 border-ep-border-default'
                )}
              >
                {product.status === 'active' ? 'Ativo' : 'Arquivado'}
              </span>
              <button className="flex items-center gap-1 text-ep-muted hover:text-ep-accent text-xs transition-colors">
                <ExternalLink size={11} />
                Ver no Stripe
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
