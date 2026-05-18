import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface SellerSummary {
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

export interface SellerDetail extends SellerSummary {
  ticketMedio: number
  pendentes: number
  reembolsos: number
}

export interface PlatformStats {
  totalSellers: number
  sellersAtivos: number
  sellersSuspensos: number
  faturamentoTotal: number
  vendasTotal: number
  ticketMedioGlobal: number
}

function dateRange(start?: string, end?: string) {
  if (!start && !end) return undefined
  return {
    ...(start ? { gte: new Date(start + 'T00:00:00.000Z') } : {}),
    ...(end ? { lte: new Date(end + 'T23:59:59.999Z') } : {}),
  }
}

export const adminService = {
  async getPlatformStats(start?: string, end?: string): Promise<PlatformStats> {
    const createdAt = dateRange(start, end)

    const [users, payments] = await Promise.all([
      prisma.user.groupBy({
        by: ['suspended'],
        _count: { id: true },
      }),
      prisma.checkoutPayment.aggregate({
        where: {
          status: 'paid',
          ...(createdAt ? { createdAt } : {}),
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ])

    const totalSellers = users.reduce((acc, u) => acc + u._count.id, 0)
    const sellersSuspensos = users.find(u => u.suspended === true)?._count.id ?? 0
    const sellersAtivos = totalSellers - sellersSuspensos
    const faturamentoTotal = payments._sum.amount ?? 0
    const vendasTotal = payments._count.id
    const ticketMedioGlobal = vendasTotal > 0 ? Math.floor(faturamentoTotal / vendasTotal) : 0

    return { totalSellers, sellersAtivos, sellersSuspensos, faturamentoTotal, vendasTotal, ticketMedioGlobal }
  },

  async listSellers(start?: string, end?: string): Promise<SellerSummary[]> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true, email: true, role: true, suspended: true, suspendedAt: true, createdAt: true },
    })

    const createdAt = dateRange(start, end)

    const sellerIds = users.map(u => u.id)

    const [productCounts, paymentStats] = await Promise.all([
      prisma.product.groupBy({
        by: ['userId'],
        where: { userId: { in: sellerIds }, active: true },
        _count: { id: true },
      }),
      prisma.checkoutPayment.findMany({
        where: {
          product: { userId: { in: sellerIds } },
          ...(createdAt ? { createdAt } : {}),
        },
        select: { status: true, amount: true, product: { select: { userId: true } } },
      }),
    ])

    const productMap = new Map(productCounts.map(p => [p.userId, p._count.id]))

    const statsMap = new Map<string, { vendas: number; falhas: number; faturamento: number }>()
    for (const p of paymentStats) {
      const uid = p.product.userId
      const cur = statsMap.get(uid) ?? { vendas: 0, falhas: 0, faturamento: 0 }
      if (p.status === 'paid') {
        cur.vendas++
        cur.faturamento += p.amount
      } else if (p.status === 'failed') {
        cur.falhas++
      }
      statsMap.set(uid, cur)
    }

    return users.map(u => {
      const stats = statsMap.get(u.id) ?? { vendas: 0, falhas: 0, faturamento: 0 }
      const total = stats.vendas + stats.falhas
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        suspended: u.suspended,
        suspendedAt: u.suspendedAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        products: productMap.get(u.id) ?? 0,
        faturamento: stats.faturamento,
        vendas: stats.vendas,
        falhas: stats.falhas,
        taxaConversao: total > 0 ? parseFloat(((stats.vendas / total) * 100).toFixed(1)) : 0,
      }
    })
  },

  async getSellerDetail(sellerId: string, start?: string, end?: string): Promise<SellerDetail | null> {
    const user = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true, username: true, email: true, role: true, suspended: true, suspendedAt: true, createdAt: true },
    })
    if (!user) return null

    const createdAt = dateRange(start, end)

    const productIds = await prisma.product.findMany({
      where: { userId: sellerId },
      select: { id: true },
    })
    const ids = productIds.map(p => p.id)

    const [productCount, payments] = await Promise.all([
      prisma.product.count({ where: { userId: sellerId, active: true } }),
      ids.length > 0
        ? prisma.checkoutPayment.groupBy({
            by: ['status'],
            where: { productId: { in: ids }, ...(createdAt ? { createdAt } : {}) },
            _count: { status: true },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
    ])

    const byStatus = Object.fromEntries(
      (payments as { status: string; _count: { status: number }; _sum: { amount: number | null } }[])
        .map(r => [r.status, { count: r._count.status, sum: r._sum.amount ?? 0 }])
    )

    const vendas = byStatus['paid']?.count ?? 0
    const falhas = byStatus['failed']?.count ?? 0
    const pendentes = byStatus['pending']?.count ?? 0
    const reembolsos = byStatus['refunded']?.count ?? 0
    const faturamento = byStatus['paid']?.sum ?? 0
    const total = vendas + falhas
    const taxaConversao = total > 0 ? parseFloat(((vendas / total) * 100).toFixed(1)) : 0
    const ticketMedio = vendas > 0 ? Math.floor(faturamento / vendas) : 0

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      suspended: user.suspended,
      suspendedAt: user.suspendedAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      products: productCount,
      faturamento,
      vendas,
      falhas,
      taxaConversao,
      ticketMedio,
      pendentes,
      reembolsos,
    }
  },

  async getSellerPayments(sellerId: string, start?: string, end?: string, limit = 50) {
    const productIds = await prisma.product.findMany({
      where: { userId: sellerId },
      select: { id: true },
    })
    const ids = productIds.map(p => p.id)
    if (ids.length === 0) return []

    const createdAt = dateRange(start, end)

    return prisma.checkoutPayment.findMany({
      where: { productId: { in: ids }, ...(createdAt ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { product: { select: { name: true } } },
    })
  },

  async getSellerProducts(sellerId: string) {
    return prisma.product.findMany({
      where: { userId: sellerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, price: true, currency: true, sales: true, revenue: true, status: true, active: true, createdAt: true },
    })
  },

  async suspendSeller(sellerId: string): Promise<boolean> {
    const user = await prisma.user.update({
      where: { id: sellerId },
      data: { suspended: true, suspendedAt: new Date() },
    })
    logger.info('ADMIN', 'Seller suspenso', { sellerId, username: user.username })
    return true
  },

  async activateSeller(sellerId: string): Promise<boolean> {
    const user = await prisma.user.update({
      where: { id: sellerId },
      data: { suspended: false, suspendedAt: null },
    })
    logger.info('ADMIN', 'Seller reativado', { sellerId, username: user.username })
    return true
  },

  async updateRole(sellerId: string, role: string): Promise<boolean> {
    if (!['user', 'admin'].includes(role)) return false
    const user = await prisma.user.update({
      where: { id: sellerId },
      data: { role },
    })
    logger.info('ADMIN', 'Role alterado', { sellerId, username: user.username, novoRole: role })
    return true
  },

  async deleteSeller(sellerId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: sellerId }, select: { username: true } })
    if (!user) return false

    await prisma.product.deleteMany({ where: { userId: sellerId } })
    await prisma.user.delete({ where: { id: sellerId } })
    logger.info('ADMIN', 'Seller deletado', { sellerId, username: user.username })
    return true
  },
}
