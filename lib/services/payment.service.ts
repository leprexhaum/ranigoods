import { prisma } from '@/lib/prisma'
import type { Payment, PaymentsQuery, PaymentsResponse } from '@/lib/types/payment'

function toPayment(r: {
  id: string
  customerName: string; customerEmail: string; amount: number; status: string
  createdAt: Date; paymentMethod: string
  cardLast4: string; cardBrand: string; cardCountry: string
  riskLevel: string; fee: number; net: number
  stripeCustomerId: string; balanceTxId: string; refundedAmount: number
  product: { name: string }
}): Payment {
  return {
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
  }
}

// Mapeia status do frontend (Payment) para status do CheckoutPayment
function mapStatus(status?: string): string | undefined {
  if (!status || status === 'all') return undefined
  if (status === 'succeeded') return 'paid'
  return status
}

export const paymentService = {
  async query(params: PaymentsQuery & { userId: string }): Promise<PaymentsResponse> {
    const { userId, status, search, start, end, page = 1, limit = 20 } = params

    // Buscar produtos do userId
    const products = await prisma.product.findMany({
      where:  { userId },
      select: { id: true },
    })
    const productIds = products.map(p => p.id)
    if (productIds.length === 0) {
      return { data: [], total: 0, page, limit, pages: 0 }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { productId: { in: productIds } }

    const mappedStatus = mapStatus(status)
    if (mappedStatus) where.status = mappedStatus

    if (start || end) {
      where.createdAt = {
        ...(start ? { gte: new Date(start + 'T00:00:00.000Z') } : {}),
        ...(end   ? { lte: new Date(end   + 'T23:59:59.999Z') } : {}),
      }
    }

    if (search) {
      const q = search.toLowerCase()
      where.OR = [
        { customerName:  { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { id:            { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
      ]
    }

    const [total, rows] = await Promise.all([
      prisma.checkoutPayment.count({ where }),
      prisma.checkoutPayment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: { product: { select: { name: true } } },
      }),
    ])

    return {
      data:  rows.map(toPayment),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    }
  },

  async getById(id: string, userId: string): Promise<Payment | null> {
    const r = await prisma.checkoutPayment.findFirst({
      where:   { id, product: { userId } },
      include: { product: { select: { name: true } } },
    })
    return r ? toPayment(r) : null
  },
}
