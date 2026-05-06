import { prisma } from '@/lib/prisma'
import type { DashboardStats, DailySale } from '@/lib/types/dashboard'
import type { Payment } from '@/lib/types/payment'

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return parseFloat(((current - previous) / previous * 100).toFixed(1))
}

function buildDateRange(start?: string, end?: string) {
  const where: Record<string, unknown> = {}
  if (start || end) {
    where.isoDate = {
      ...(start ? { gte: start } : {}),
      ...(end   ? { lte: end   } : {}),
    }
  }
  return where
}

function buildPaymentDateRange(start?: string, end?: string) {
  const where: Record<string, unknown> = {}
  if (start || end) {
    where.createdAt = {
      ...(start ? { gte: new Date(start + 'T00:00:00.000Z') } : {}),
      ...(end   ? { lte: new Date(end   + 'T23:59:59.999Z') } : {}),
    }
  }
  return where
}

/** Calcula o período anterior com a mesma duração */
function previousPeriod(start?: string, end?: string): { start?: string; end?: string } {
  if (!start || !end) return {}
  const s   = new Date(start)
  const e   = new Date(end)
  const dur = e.getTime() - s.getTime()
  const ps  = new Date(s.getTime() - dur - 86400000)
  const pe  = new Date(s.getTime() - 86400000)
  return {
    start: ps.toISOString().slice(0, 10),
    end:   pe.toISOString().slice(0, 10),
  }
}

/** Gera todos os dias entre start e end com zeros */
function generateEmptyDays(start?: string, end?: string): DailySale[] {
  if (!start || !end) {
    // Sem range: gerar os últimos 30 dias
    const days: DailySale[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      days.push({
        date:    d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
        isoDate: iso,
        receita: 0,
        vendas:  0,
        falhas:  0,
      })
    }
    return days
  }

  const days: DailySale[] = []
  const cur = new Date(start)
  const fin = new Date(end)
  while (cur <= fin) {
    const iso = cur.toISOString().slice(0, 10)
    days.push({
      date:    cur.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
      isoDate: iso,
      receita: 0,
      vendas:  0,
      falhas:  0,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

async function calcStats(start?: string, end?: string) {
  const salesWhere   = buildDateRange(start, end)
  const payWhere     = buildPaymentDateRange(start, end)

  const [sales, statusCounts] = await Promise.all([
    prisma.dailySale.findMany({ where: salesWhere }),
    prisma.payment.groupBy({
      by:    ['status'],
      where: payWhere,
      _count: { status: true },
    }),
  ])

  const vendas  = sales.reduce((s, d) => s + d.vendas,  0)
  const falhas  = sales.reduce((s, d) => s + d.falhas,  0)
  const receita = sales.reduce((s, d) => s + d.receita, 0)

  const statusMap = Object.fromEntries(statusCounts.map(c => [c.status, c._count.status]))
  const pendentes   = statusMap['pending']    ?? 0
  const reembolsos  = statusMap['refunded']   ?? 0
  const disputados  = statusMap['disputed']   ?? 0
  const processando = statusMap['processing'] ?? 0

  const total = vendas + falhas
  const taxa  = total > 0 ? parseFloat(((vendas / total) * 100).toFixed(1)) : 0
  const ticket = vendas > 0 ? Math.floor(receita / vendas) : 0

  return { receita, vendas, falhas, pendentes, reembolsos, disputados, processando, taxa, ticket, total }
}

export const dashboardService = {
  async getStats(start?: string, end?: string): Promise<DashboardStats> {
    const prev = previousPeriod(start, end)

    const [cur, pre] = await Promise.all([
      calcStats(start, end),
      calcStats(prev.start, prev.end),
    ])

    return {
      receitaTotal:    cur.receita,
      totalPagamentos: cur.total,
      vendas:          cur.vendas,
      falhas:          cur.falhas,
      pendentes:       cur.pendentes,
      reembolsos:      cur.reembolsos,
      disputados:      cur.disputados,
      processando:     cur.processando,
      taxaConversao:   cur.taxa,
      ticketMedio:     cur.ticket,
      receitaChange:   pctChange(cur.receita, pre.receita),
      vendasChange:    pctChange(cur.vendas,  pre.vendas),
      falhasChange:    pctChange(cur.falhas,  pre.falhas),
      conversaoChange: pctChange(cur.taxa,    pre.taxa),
      ticketChange:    pctChange(cur.ticket,  pre.ticket),
    }
  },

  async getSales(start?: string, end?: string): Promise<DailySale[]> {
    const where = buildDateRange(start, end)
    const rows  = await prisma.dailySale.findMany({ where, orderBy: { isoDate: 'asc' } })

    // Gerar todos os dias do período com zeros e sobrepor com dados reais
    const emptyDays = generateEmptyDays(start, end)
    const dataMap   = new Map(rows.map(r => [r.isoDate, r]))

    return emptyDays.map(day => {
      const real = dataMap.get(day.isoDate)
      if (!real) return day
      return {
        date:    real.date,
        isoDate: real.isoDate,
        receita: real.receita,
        vendas:  real.vendas,
        falhas:  real.falhas,
      }
    })
  },

  async getRecentPayments(start?: string, end?: string, limit = 15): Promise<Payment[]> {
    const where = buildPaymentDateRange(start, end)
    const rows  = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    limit,
    })
    return rows.map(r => ({
      id:       r.id,
      customer: r.customer,
      email:    r.email,
      amount:   r.amount,
      status:   r.status as Payment['status'],
      date:      r.date,
      createdAt: r.createdAt.toISOString(),
      product:   r.product,
      method:    r.method as Payment['method'],
    }))
  },
}
