'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, DollarSign, ShoppingCart, XCircle, TrendingUp,
  Ticket, Clock, RotateCcw, Shield, Trash2, UserCog
} from 'lucide-react'

interface SellerDetail {
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
  ticketMedio: number
  pendentes: number
  reembolsos: number
}

interface SellerProduct {
  id: string
  name: string
  price: number
  currency: string
  sales: number
  revenue: bigint
  status: string
  active: boolean
  createdAt: string
}

interface SellerPayment {
  id: string
  customer: string
  email: string
  phone: string
  amount: number
  currency: string
  status: string
  method: string
  product: string
  cardLast4: string
  cardBrand: string
  createdAt: string
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    paid: 'bg-green-500/10 text-green-400',
    succeeded: 'bg-green-500/10 text-green-400',
    failed: 'bg-red-500/10 text-red-400',
    pending: 'bg-yellow-500/10 text-yellow-400',
    refunded: 'bg-blue-500/10 text-blue-400',
  }
  const cls = styles[status] || 'bg-ep-raised text-ep-secondary'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="p-4 md:p-6 animate-pulse">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="h-8 w-48 bg-ep-raised rounded" />
        <div className="h-24 bg-ep-surface rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 bg-ep-surface rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-ep-surface rounded-lg" />
        <div className="h-64 bg-ep-surface rounded-lg" />
      </div>
    </div>
  )
}

export default function SellerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [seller, setSeller] = useState<SellerDetail | null>(null)
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [payments, setPayments] = useState<SellerPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  function getDateRange() {
    const end = new Date().toISOString().slice(0, 10)
    const start = new Date()
    start.setDate(start.getDate() - 30)
    return { start: start.toISOString().slice(0, 10), end }
  }

  async function loadData() {
    setLoading(true)
    try {
      const { start, end } = getDateRange()
      const [sellerRes, paymentsRes] = await Promise.all([
        fetch(`/api/admin/sellers/${id}?start=${start}&end=${end}`),
        fetch(`/api/admin/sellers/${id}/payments?start=${start}&end=${end}`),
      ])
      if (sellerRes.ok) {
        const data = await sellerRes.json()
        setSeller(data.seller)
        setProducts(data.products || [])
      }
      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        setPayments(data)
      }
    } catch (err) {
      console.error('Erro ao carregar dados do seller:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSuspendActivate() {
    if (!seller) return
    const action = seller.suspended ? 'activate' : 'suspend'
    const msg = seller.suspended
      ? 'Tem certeza que deseja ativar esta conta?'
      : 'Tem certeza que deseja suspender esta conta?'
    if (!window.confirm(msg)) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/sellers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) await loadData()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleChangeRole() {
    if (!seller) return
    const newRole = seller.role === 'admin' ? 'user' : 'admin'
    const msg = `Mudar role de "${seller.role}" para "${newRole}"?`
    if (!window.confirm(msg)) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/sellers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'role', role: newRole }),
      })
      if (res.ok) await loadData()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!seller) return
    if (!window.confirm(`ATENÇÃO: Deletar permanentemente a conta de "${seller.username}"?`)) return
    if (!window.confirm('Esta ação é IRREVERSÍVEL. Confirmar exclusão?')) return

    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/sellers/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/admin/sellers')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <Skeleton />
  if (!seller) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center">
        <p className="text-ep-secondary">Seller não encontrado.</p>
      </div>
    )
  }

  const metrics = [
    { label: 'Faturamento', value: formatCurrency(seller.faturamento), icon: DollarSign },
    { label: 'Vendas', value: seller.vendas.toString(), icon: ShoppingCart },
    { label: 'Falhas', value: seller.falhas.toString(), icon: XCircle },
    { label: 'Conversão', value: `${seller.taxaConversao.toFixed(1)}%`, icon: TrendingUp },
    { label: 'Ticket Médio', value: formatCurrency(seller.ticketMedio), icon: Ticket },
    { label: 'Pendentes', value: seller.pendentes.toString(), icon: Clock },
    { label: 'Reembolsos', value: seller.reembolsos.toString(), icon: RotateCcw },
  ]

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/sellers')}
            className="flex items-center gap-1 text-ep-secondary hover:text-ep-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Sellers</span>
          </button>
          <h1 className="text-2xl font-bold text-ep-primary">{seller.username}</h1>
          {seller.suspended && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400">
              Suspenso
            </span>
          )}
        </div>

        {/* Dados da conta */}
        <div className="bg-ep-surface rounded-lg p-5 border border-ep-raised">
          <h2 className="text-sm font-semibold text-ep-secondary uppercase tracking-wide mb-3">
            Dados da Conta
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <p className="text-ep-secondary">Username</p>
              <p className="text-ep-primary font-medium">{seller.username}</p>
            </div>
            <div>
              <p className="text-ep-secondary">Email</p>
              <p className="text-ep-primary font-medium">{seller.email}</p>
            </div>
            <div>
              <p className="text-ep-secondary">Role</p>
              <p className="text-ep-primary font-medium">{seller.role}</p>
            </div>
            <div>
              <p className="text-ep-secondary">Cadastro</p>
              <p className="text-ep-primary font-medium">
                {new Date(seller.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-ep-secondary">Status</p>
              <p className={`font-medium ${seller.suspended ? 'text-red-400' : 'text-green-400'}`}>
                {seller.suspended ? 'Suspenso' : 'Ativo'}
              </p>
            </div>
            {seller.suspendedAt && (
              <div>
                <p className="text-ep-secondary">Suspenso em</p>
                <p className="text-ep-primary font-medium">
                  {new Date(seller.suspendedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-ep-surface rounded-lg p-4 border border-ep-raised">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-4 h-4 text-ep-accent" />
                <span className="text-xs text-ep-secondary">{m.label}</span>
              </div>
              <p className="text-lg font-bold text-ep-primary">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Ações Admin */}
        <div className="bg-ep-surface rounded-lg p-5 border border-ep-raised">
          <h2 className="text-sm font-semibold text-ep-secondary uppercase tracking-wide mb-3">
            Ações Admin
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSuspendActivate}
              disabled={actionLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                seller.suspended
                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                  : 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
              }`}
            >
              <Shield className="w-4 h-4" />
              {seller.suspended ? 'Ativar Conta' : 'Suspender Conta'}
            </button>
            <button
              onClick={handleChangeRole}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-ep-accent/10 text-ep-accent hover:bg-ep-accent/20 transition-colors disabled:opacity-50"
            >
              <UserCog className="w-4 h-4" />
              Mudar para {seller.role === 'admin' ? 'User' : 'Admin'}
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Deletar Conta
            </button>
          </div>
        </div>

        {/* Produtos do Seller */}
        <div className="bg-ep-surface rounded-lg border border-ep-raised overflow-hidden">
          <div className="p-5 border-b border-ep-raised">
            <h2 className="text-sm font-semibold text-ep-secondary uppercase tracking-wide">
              Produtos ({products.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ep-raised text-ep-secondary">
                  <th className="text-left p-3 font-medium">Nome</th>
                  <th className="text-left p-3 font-medium">Preço</th>
                  <th className="text-left p-3 font-medium">Vendas</th>
                  <th className="text-left p-3 font-medium">Receita</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-ep-secondary">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="border-b border-ep-raised/50 hover:bg-ep-raised/30">
                      <td className="p-3 text-ep-primary">{p.name}</td>
                      <td className="p-3 text-ep-primary">{formatCurrency(p.price)}</td>
                      <td className="p-3 text-ep-primary">{p.sales}</td>
                      <td className="p-3 text-ep-primary">{formatCurrency(Number(p.revenue))}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {p.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Últimas Vendas */}
        <div className="bg-ep-surface rounded-lg border border-ep-raised overflow-hidden">
          <div className="p-5 border-b border-ep-raised">
            <h2 className="text-sm font-semibold text-ep-secondary uppercase tracking-wide">
              Últimas Vendas ({payments.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ep-raised text-ep-secondary">
                  <th className="text-left p-3 font-medium">Cliente</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Valor</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Método</th>
                  <th className="text-left p-3 font-medium">Produto</th>
                  <th className="text-left p-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-ep-secondary">
                      Nenhuma venda encontrada.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="border-b border-ep-raised/50 hover:bg-ep-raised/30">
                      <td className="p-3 text-ep-primary">{p.customer}</td>
                      <td className="p-3 text-ep-secondary">{p.email}</td>
                      <td className="p-3 text-ep-primary">{formatCurrency(p.amount)}</td>
                      <td className="p-3"><StatusBadge status={p.status} /></td>
                      <td className="p-3 text-ep-primary">{p.method}</td>
                      <td className="p-3 text-ep-primary">{p.product}</td>
                      <td className="p-3 text-ep-secondary">
                        {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
