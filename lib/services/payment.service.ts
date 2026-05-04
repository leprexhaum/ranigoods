import { prisma } from '@/lib/prisma'
import type { Payment, PaymentsQuery, PaymentsResponse } from '@/lib/types/payment'

function toPayment(r: { id: string; customer: string; email: string; amount: number; status: string; date: string; product: string; method: string }): Payment {
  return {
    id:       r.id,
    customer: r.customer,
    email:    r.email,
    amount:   r.amount,
    status:   r.status as Payment['status'],
    date:     r.date,
    product:  r.product,
    method:   r.method as Payment['method'],
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
    if (start || end) where.date = { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) }
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
        orderBy: { date: 'desc' },
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
