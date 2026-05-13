import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

interface CreateAbandonedCartData {
  productId:             string
  stripePaymentIntentId: string
  customerName:          string
  customerEmail:         string
  customerPhone:         string
  amount:                number
  currency:              string
  urlParams:             Record<string, string>
  bumpIds:               string[]
  shippingId:            string
}

export const abandonedCartService = {
  async create(data: CreateAbandonedCartData): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      await prisma.abandonedCart.upsert({
        where: { stripePaymentIntentId: data.stripePaymentIntentId },
        create: {
          productId:             data.productId,
          stripePaymentIntentId: data.stripePaymentIntentId,
          customerName:          data.customerName,
          customerEmail:         data.customerEmail,
          customerPhone:         data.customerPhone,
          amount:                data.amount,
          currency:              data.currency,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          urlParams:             data.urlParams as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          bumpIds:               data.bumpIds as any,
          shippingId:            data.shippingId,
          status:                'pending',
          expiresAt,
        },
        update: {
          customerName:  data.customerName  || undefined,
          customerEmail: data.customerEmail || undefined,
          customerPhone: data.customerPhone || undefined,
        },
      })
      logger.info('CHECKOUT', 'Carrinho abandonado registado', { piId: data.stripePaymentIntentId, email: data.customerEmail, expira: expiresAt.toISOString() })
    } catch (err) {
      logger.error('CHECKOUT', 'Erro ao registar carrinho abandonado', { piId: data.stripePaymentIntentId, error: err instanceof Error ? err.message : String(err) })
    }
  },

  async markRecovered(stripePaymentIntentId: string): Promise<void> {
    try {
      await prisma.abandonedCart.updateMany({
        where: { stripePaymentIntentId, status: { not: 'recovered' } },
        data:  { status: 'recovered', recoveredAt: new Date() },
      })
      logger.info('WEBHOOK', 'Carrinho abandonado recuperado', { piId: stripePaymentIntentId })
    } catch (err) {
      logger.error('CHECKOUT', 'Erro ao marcar carrinho recuperado', { piId: stripePaymentIntentId, error: err instanceof Error ? err.message : String(err) })
    }
  },

  async detectAbandoned(): Promise<number> {
    const threshold = new Date(Date.now() - 60 * 60 * 1000)
    const result = await prisma.abandonedCart.updateMany({
      where: { status: 'pending', createdAt: { lt: threshold } },
      data:  { status: 'abandoned' },
    })
    if (result.count > 0) {
      const abandoned = await prisma.abandonedCart.findMany({
        where:  { status: 'abandoned', createdAt: { lt: threshold } },
        select: { stripePaymentIntentId: true },
      })
      const piIds = abandoned.map(a => a.stripePaymentIntentId)
      if (piIds.length > 0) {
        await prisma.checkoutPayment.updateMany({
          where: { stripePaymentIntentId: { in: piIds }, status: 'pending' },
          data:  { isAbandoned: true },
        })
      }
      logger.info('CRON', 'CheckoutPayments atualizados', { job: 'abandoned-carts', isAbandoned: true, afetados: piIds.length })
    }
    return result.count
  },

  async getAll(params: {
    userId:   string
    status?:  string
    search?:  string
    page?:    number
    limit?:   number
  } = { userId: '' }) {
    const { userId, status, search, page = 1, limit = 20 } = params

    const products = await prisma.product.findMany({
      where:  { userId },
      select: { id: true },
    })
    const productIds = products.map(p => p.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = productIds.length > 0
      ? { productId: { in: productIds } }
      : { productId: '__none__' }

    if (status && status !== 'all') where.status = status
    if (search) {
      where.OR = [
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerName:  { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, data] = await Promise.all([
      prisma.abandonedCart.count({ where }),
      prisma.abandonedCart.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
    ])

    return { data, total, page, limit, pages: Math.ceil(total / limit) }
  },
}
