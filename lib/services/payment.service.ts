import { prisma } from '@/lib/prisma'
import type { Payment, PaymentsQuery, PaymentsResponse } from '@/lib/types/payment'

function toPayment(r: {
  id: string; customer: string; email: string; amount: number; status: string;
  date: string; createdAt: Date; product: string; method: string;
  cardLast4: string; cardBrand: string; cardCountry: string;
  riskLevel: string; riskScore: number; fee: number; net: number;
  stripeCustomerId: string; balanceTxId: string; refundedAmount: number;
}): Payment {
  return {
    id:               r.id,
    customer:         r.customer,
    email:            r.email,
    amount:           r.amount,
    status:           r.status as Payment['status'],
    date:             r.date,
    createdAt:        r.createdAt.toISOString(),
    product:          r.product,
    method:           r.method as Payment['method'],
    cardLast4:        r.cardLast4,
    cardBrand:        r.cardBrand,
    cardCountry:      r.cardCountry,
    riskLevel:        r.riskLevel,
    riskScore:        r.riskScore,
    fee:              r.fee,
    net:              r.net,
    stripeCustomerId: r.stripeCustomerId,
    balanceTxId:      r.balanceTxId,
    refundedAmount:   r.refundedAmount,
  }
}

export const paymentService = {
  async query(params: PaymentsQuery = {}): Promise<PaymentsResponse> {
    const { status, search, start, end, page = 1, limit = 20, method } = params
    const q = search?.toLowerCase()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}

    if (status && status !== 'all') where.status = status
    if (method && method !== 'all') where.method = method
    if (start || end) where.createdAt = {
      ...(start ? { gte: new Date(start + 'T00:00:00.000Z') } : {}),
      ...(end   ? { lte: new Date(end   + 'T23:59:59.999Z') } : {}),
    }
    if (q) {
      where.OR = [
        { customer: { contains: q, mode: 'insensitive' } },
        { email:    { contains: q, mode: 'insensitive' } },
        { id:       { contains: q, mode: 'insensitive' } },
        { product:  { contains: q, mode: 'insensitive' } },
      ]
    }

    const [total, rows] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:  (page - 1) * limit,
        take:  limit,
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

  async getById(id: string): Promise<Payment | null> {
    const r = await prisma.payment.findUnique({ where: { id } })
    return r ? toPayment(r) : null
  },

  async summary() {
    const counts = await prisma.payment.groupBy({
      by: ['status'],
      _count: { status: true },
    })

    const map = Object.fromEntries(counts.map(c => [c.status, c._count.status]))
    const total = counts.reduce((s, c) => s + c._count.status, 0)

    return {
      total,
      succeeded: map['succeeded'] ?? 0,
      failed:    map['failed']    ?? 0,
      pending:   map['pending']   ?? 0,
      refunded:  map['refunded']  ?? 0,
    }
  },
}
