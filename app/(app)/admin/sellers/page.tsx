'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Users, DollarSign, ShoppingCart, TrendingUp, Search } from 'lucide-react'

interface Seller {
  id: string
  username: string
  email: string
  role: string
  suspended: boolean
  suspendedAt: string | null
  createdAt: string
  products: number
  faturamento: number
  vendas: number
  falhas: number
  taxaConversao: number
}

interface PlatformStats {
  totalSellers: number
  sellersAtivos: number
  sellersSuspensos: number
  faturamentoTotal: number
  vendasTotal: number
  ticketMedioGlobal: number
}

export default function AdminSellersPage() {
  const router = useRouter()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('30d')

  function getDateRange() {
    const end = new Date().toISOString().slice(0, 10)
    const start = new Date()
    if (period === '7d') start.setDate(start.getDate() - 7)
    else if (period === '30d') start.setDate(start.getDate() - 30)
    else if (period === '90d') start.setDate(start.getDate() - 90)
    else return {}
    return { start: start.toISOString().slice(0, 10), end }
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const range = getDateRange()
      const qs = new URLSearchParams()
      if (range.start) qs.set('start', range.start)
      if (range.end) qs.set('end', range.end)
      const q = qs.toString() ? `?${qs}` : ''

      const [sellersRes, statsRes] = await Promise.all([
        fetch(`/api/admin/sellers${q}`),
        fetch(`/api/admin/stats${q}`),
      ])

      if (sellersRes.ok) setSellers(await sellersRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
      setLoading(false)
    }
    load()
  }, [period])

  const filtered = sellers.filter(s =>
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  function formatCurrency(cents: number) {
    return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
  }

  async function handleExport() {
    const range = getDateRange()
    const qs = new URLSearchParams()
    if (range.start) qs.set('start', range.start)
    if (range.end) qs.set('end', range.end)
    const q = qs.toString() ? `?${qs}` : ''
    window.open(`/api/admin/sellers/export${q}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ep-primary">Sellers</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-ep-raised text-ep-primary rounded-lg hover:bg-ep-accent hover:text-ep-base transition-colors text-sm font-medium"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-ep-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-ep-secondary text-sm mb-1">
              <Users size={14} />
              Sellers Ativos
            </div>
            <p className="text-xl font-bold text-ep-primary">{stats.sellersAtivos}</p>
            {stats.sellersSuspensos > 0 && (
              <p className="text-xs text-red-400 mt-1">{stats.sellersSuspensos} suspenso(s)</p>
            )}
          </div>
          <div className="bg-ep-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-ep-secondary text-sm mb-1">
              <DollarSign size={14} />
              Faturamento Total
            </div>
            <p className="text-xl font-bold text-ep-accent">{formatCurrency(stats.faturamentoTotal)}</p>
          </div>
          <div className="bg-ep-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-ep-secondary text-sm mb-1">
              <ShoppingCart size={14} />
              Vendas Totais
            </div>
            <p className="text-xl font-bold text-ep-primary">{stats.vendasTotal}</p>
          </div>
          <div className="bg-ep-surface rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-ep-secondary text-sm mb-1">
              <TrendingUp size={14} />
              Ticket Médio
            </div>
            <p className="text-xl font-bold text-ep-primary">{formatCurrency(stats.ticketMedioGlobal)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-secondary" />
          <input
            type="text"
            placeholder="Buscar por username ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-ep-raised border border-white/10 rounded-lg text-ep-primary placeholder:text-ep-secondary text-sm focus:outline-none focus:border-ep-accent"
          />
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="px-4 py-2 bg-ep-raised border border-white/10 rounded-lg text-ep-primary text-sm focus:outline-none focus:border-ep-accent"
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="all">Todo o período</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-ep-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ep-secondary text-left border-b border-white/5">
                <th className="pb-3 font-medium">Seller</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Produtos</th>
                <th className="pb-3 font-medium text-right">Faturamento</th>
                <th className="pb-3 font-medium text-right">Vendas</th>
                <th className="pb-3 font-medium text-right">Conversão</th>
                <th className="pb-3 font-medium text-right">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(seller => (
                <tr
                  key={seller.id}
                  onClick={() => router.push(`/admin/sellers/${seller.id}`)}
                  className="border-b border-white/5 hover:bg-ep-raised/50 cursor-pointer transition-colors"
                >
                  <td className="py-3">
                    <div>
                      <p className="text-ep-primary font-medium">{seller.username}</p>
                      <p className="text-ep-secondary text-xs">{seller.email}</p>
                    </div>
                  </td>
                  <td className="py-3">
                    {seller.suspended ? (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs font-medium">Suspenso</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs font-medium">Ativo</span>
                    )}
                    {seller.role === 'admin' && (
                      <span className="ml-1 px-2 py-0.5 bg-ep-accent/10 text-ep-accent rounded text-xs font-medium">Admin</span>
                    )}
                  </td>
                  <td className="py-3 text-right text-ep-primary">{seller.products}</td>
                  <td className="py-3 text-right text-ep-accent font-medium">{formatCurrency(seller.faturamento)}</td>
                  <td className="py-3 text-right text-ep-primary">{seller.vendas}</td>
                  <td className="py-3 text-right text-ep-primary">{seller.taxaConversao}%</td>
                  <td className="py-3 text-right text-ep-secondary text-xs">{new Date(seller.createdAt).toLocaleDateString('pt-PT')}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ep-secondary">
                    Nenhum seller encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
