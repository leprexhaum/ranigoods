import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { DashboardStats, DailySale } from '@/lib/types/dashboard'
import type { Payment } from '@/lib/types/payment'

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return parseFloat(((current - previous) / previous * 100).toFixed(1))
}

function dateRange(start?: string, end?: string) {
  if (!start && !end) return undefined
  return {
    ...(start ? { gte: new Date(start + 'T00:00:00.000Z') } : {}),
    ...(end   ? { lte: new Date(end   + 'T23:59:59.999Z') } : {}),
  }
}

function previousPeriod(start?: string, end?: string): { start?: string; end?: string } {
  if (!start || !end) return {}
  const s   = new Date(start)
  const e   = new Date(end)
  const dur = e.getTime() - s.getTime()
  const ps  = new Date(s.getTime() - dur - 86400000)
  const pe  = new Date(s.getTime() - 86400000)
  return { start: ps.toISOString().slice(0, 10), end: pe.toISOString().slice(0, 10) }
}

function generateEmptyDays(start?: string, end?: string): DailySale[] {
  const days: DailySale[] = []
  if (!start || !end) {
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      days.push({ date: d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }), isoDate: iso, receita: 0, vendas: 0, falhas: 0 })
    }
    return days
  }
  const cur = new Date(start)
  const fin = new Date(end)
  while (cur <= fin) {
    const iso = cur.toISOString().slice(0, 10)
    days.push({ date: cur.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }), isoDate: iso, receita: 0, vendas: 0, falhas: 0 })
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

// Busca IDs dos produtos do userId
async function productIdsForUser(userId: string): Promise<string[]> {
  const products = await prisma.product.findMany({
    where:  { userId },
    select: { id: true },
  })
  return products.map(p => p.id)
}

async function calcStats(userId: string, start?: string, end?: string) {
  const productIds = await productIdsForUser(userId)
  if (productIds.length === 0) {
    return { receita: 0, vendas: 0, falhas: 0, pendentes: 0, reembolsos: 0, disputados: 0, processando: 0, taxa: 0, ticket: 0, total: 0 }
  }

  const createdAt = dateRange(start, end)
  const where = {
    productId: { in: productIds },
    ...(createdAt ? { createdAt } : {}),
  }

  const rows = await prisma.checkoutPayment.groupBy({
    by:    ['status'],
    where,
    _count: { status: true },
    _sum:   { amount: true },
  })

  const byStatus = Object.fromEntries(rows.map(r => [r.status, { count: r._count.status, sum: r._sum.amount ?? 0 }]))

  const vendas      = byStatus['paid']?.count       ?? 0
  const falhas      = byStatus['failed']?.count     ?? 0
  const pendentes   = byStatus['pending']?.count    ?? 0
  const reembolsos  = byStatus['refunded']?.count   ?? 0
  const disputados  = byStatus['disputed']?.count   ?? 0
  const processando = byStatus['processing']?.count ?? 0
  const receita     = byStatus['paid']?.sum         ?? 0

  const total = vendas + falhas
  const taxa  = total > 0 ? parseFloat(((vendas / total) * 100).toFixed(1)) : 0
  const ticket = vendas > 0 ? Math.floor(receita / vendas) : 0

  return { receita, vendas, falhas, pendentes, reembolsos, disputados, processando, taxa, ticket, total }
}

export const dashboardService = {
  async getStats(userId: string, start?: string, end?: string): Promise<DashboardStats> {
    logger.info('DASHBOARD', 'Calculando estatísticas', { userId, periodo: `${start ?? 'inicio'}..${end ?? 'hoje'}` })
    const prev = previousPeriod(start, end)
    const [cur, pre] = await Promise.all([
      calcStats(userId, start, end),
      calcStats(userId, prev.start, prev.end),
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

  async getSales(userId: string, start?: string, end?: string): Promise<DailySale[]> {
    const productIds = await productIdsForUser(userId)
    const emptyDays  = generateEmptyDays(start, end)
    if (productIds.length === 0) return emptyDays

    const createdAt = dateRange(start, end)
    const rows = await prisma.checkoutPayment.findMany({
      where: {
        productId: { in: productIds },
        status:    'paid',
        ...(createdAt ? { createdAt } : {}),
      },
      select: { amount: true, createdAt: true },
    })

    // Agrupar por dia
    const failRows = await prisma.checkoutPayment.findMany({
      where: {
        productId: { in: productIds },
        status:    'failed',
        ...(createdAt ? { createdAt } : {}),
      },
      select: { createdAt: true },
    })

    const salesMap = new Map<string, { receita: number; vendas: number; falhas: number }>()
    for (const r of rows) {
      const iso = r.createdAt.toISOString().slice(0, 10)
      const cur = salesMap.get(iso) ?? { receita: 0, vendas: 0, falhas: 0 }
      salesMap.set(iso, { ...cur, receita: cur.receita + r.amount, vendas: cur.vendas + 1 })
    }
    for (const r of failRows) {
      const iso = r.createdAt.toISOString().slice(0, 10)
      const cur = salesMap.get(iso) ?? { receita: 0, vendas: 0, falhas: 0 }
      salesMap.set(iso, { ...cur, falhas: cur.falhas + 1 })
    }

    return emptyDays.map(day => {
      const real = salesMap.get(day.isoDate)
      if (!real) return day
      return { ...day, receita: real.receita, vendas: real.vendas, falhas: real.falhas }
    })
  },

  async getRecentPayments(userId: string, start?: string, end?: string, limit = 15): Promise<Payment[]> {
    const productIds = await productIdsForUser(userId)
    if (productIds.length === 0) return []

    const createdAt = dateRange(start, end)
    const rows = await prisma.checkoutPayment.findMany({
      where: {
        productId: { in: productIds },
        ...(createdAt ? { createdAt } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      include: { product: { select: { name: true } } },
    })

    return rows.map(r => ({
      id:               r.id,
      customer:         r.customerName  || 'Cliente',
      email:            r.customerEmail || '',
      amount:           r.amount,
      status:           (r.status === 'paid' ? 'succeeded' : r.status) as Payment['status'],
      date:             r.createdAt.toISOString().slice(0, 10),
      createdAt:        r.createdAt.toISOString(),
      product:          r.product.name,
      method:           (r.paymentMethod || 'Cartão') as Payment['method'],
      cardLast4:        r.cardLast4,
      cardBrand:        r.cardBrand,
      cardCountry:      r.cardCountry,
      riskLevel:        r.riskLevel,
      riskScore:        0,
      fee:              r.fee,
      net:              r.net,
      stripeCustomerId: r.stripeCustomerId,
      balanceTxId:      r.balanceTxId,
      refundedAmount:   r.refundedAmount,
    }))
  },
}
