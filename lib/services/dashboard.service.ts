import { prisma } from '@/lib/prisma'
import type { DashboardStats, DailySale } from '@/lib/types/dashboard'
import type { Payment } from '@/lib/types/payment'

export const dashboardService = {
  async getStats(start?: string, end?: string): Promise<DashboardStats> {
    const where: Record<string, unknown> = {}
    if (start || end) {
      where.isoDate = { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) }
    }

    const sales = await prisma.dailySale.findMany({ where })

    const vendas  = sales.reduce((s, d) => s + d.vendas,  0)
    const falhas  = sales.reduce((s, d) => s + d.falhas,  0)
    const receita = sales.reduce((s, d) => s + d.receita, 0)
    const total   = vendas + falhas
    const taxa    = total > 0 ? (vendas / total) * 100 : 0
    const ticket  = vendas > 0 ? Math.floor(receita / vendas) : 0

    return {
      receitaTotal:    receita,
      totalPagamentos: total,
      vendas,
      falhas,
      taxaConversao:   parseFloat(taxa.toFixed(1)),
      ticketMedio:     ticket,
    }
  },

  async getSales(start?: string, end?: string): Promise<DailySale[]> {
    const where: Record<string, unknown> = {}
    if (start || end) {
      where.isoDate = { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) }
    }

    const rows = await prisma.dailySale.findMany({ where, orderBy: { isoDate: 'asc' } })
    return rows.map(r => ({
      date:    r.date,
      isoDate: r.isoDate,
      receita: r.receita,
      vendas:  r.vendas,
      falhas:  r.falhas,
    }))
  },

  async getRecentPayments(start?: string, end?: string, limit = 15): Promise<Payment[]> {
    const where: Record<string, unknown> = {}
    if (start || end) {
      where.date = { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) }
    }

    const rows = await prisma.payment.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
    })

    return rows.map(r => ({
      id:       r.id,
      customer: r.customer,
      email:    r.email,
      amount:   r.amount,
      status:   r.status as Payment['status'],
      date:     r.date,
      product:  r.product,
      method:   r.method as Payment['method'],
    }))
  },
}
