import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type {
  CheckoutProduct, CheckoutPaymentDetail, CheckoutColors,
  OrderBump, ShippingOption, CheckoutReview, CheckoutAddress,
} from '@/lib/types/checkout'
import { DEFAULT_CHECKOUT_COLORS } from '@/lib/types/checkout'

function toCheckoutProduct(r: {
  id: string; name: string; description: string; imageUrl: string;
  price: number; currency: string; interval: string;
  slug: string | null; paymentMethods: unknown; shippingOptions: unknown;
  orderBumps: unknown; reviews: unknown; showReviews: boolean;
  checkoutTemplate: string; checkoutLanguage: string; countdownMinutes: number;
  active: boolean; successUrl: string;
  logoUrl: string; brandName: string; legalName: string; requirePhone: boolean; requireAddress: boolean;
  checkoutColors: unknown;
}, globalColors: Partial<CheckoutColors>): CheckoutProduct {
  const productColors = (r.checkoutColors && typeof r.checkoutColors === 'object' && Object.keys(r.checkoutColors as object).length > 0)
    ? r.checkoutColors as Partial<CheckoutColors>
    : {}

  const resolvedColors = { ...DEFAULT_CHECKOUT_COLORS, ...globalColors, ...productColors }

  return {
    id:               r.id,
    name:             r.name,
    description:      r.description ?? '',
    imageUrl:         r.imageUrl ?? '',
    price:            r.price,
    currency:         r.currency,
    interval:         r.interval,
    slug:             r.slug ?? '',
    paymentMethods:   (r.paymentMethods as string[]) ?? [],
    shippingOptions:  (r.shippingOptions as ShippingOption[]) ?? [],
    orderBumps:       (r.orderBumps as OrderBump[]) ?? [],
    reviews:          (r.reviews as CheckoutReview[]) ?? [],
    showReviews:      r.showReviews ?? false,
    checkoutTemplate: 'stripe_split' as CheckoutProduct['checkoutTemplate'],
    checkoutLanguage: r.checkoutLanguage ?? 'pt',
    countdownMinutes: r.countdownMinutes ?? 15,
    active:           r.active ?? true,
    successUrl:       r.successUrl ?? '',
    logoUrl:          r.logoUrl ?? '',
    brandName:        r.brandName ?? '',
    legalName:        r.legalName ?? '',
    requirePhone:     r.requirePhone ?? false,
    requireAddress:   r.requireAddress ?? false,
    checkoutColors:   resolvedColors,
  }
}

export const checkoutService = {
  async getProductBySlug(slug: string): Promise<CheckoutProduct | null> {
    const r = await prisma.product.findUnique({
      where: { slug, active: true },
      select: {
        id: true, name: true, description: true, imageUrl: true,
        price: true, currency: true, interval: true,
        slug: true, paymentMethods: true, shippingOptions: true,
        orderBumps: true, reviews: true, showReviews: true,
        checkoutTemplate: true, checkoutLanguage: true, countdownMinutes: true,
        active: true, successUrl: true,
        logoUrl: true, brandName: true, legalName: true, requirePhone: true, requireAddress: true,
        checkoutColors: true,
      },
    })
    if (!r) {
      logger.warn('CHECKOUT', 'Produto não encontrado por slug', { slug })
      return null
    }

    // Buscar cores globais do Settings
    const settings = await prisma.settings.findFirst({ where: { id: 1 }, select: { checkoutColors: true } })
    const globalColors = (settings?.checkoutColors && typeof settings.checkoutColors === 'object' && Object.keys(settings.checkoutColors as object).length > 0)
      ? settings.checkoutColors as Partial<CheckoutColors>
      : {}

    logger.info('CHECKOUT', 'Produto carregado para checkout', { slug, productId: r.id })
    return toCheckoutProduct(r, globalColors)
  },

  async createPayment(data: {
    productId:             string
    amount:                number
    currency:              string
    stripePaymentIntentId: string
    customerName:          string
    customerEmail:         string
    customerPhone:         string
    stripeCustomerId?:     string
    urlParams:             Record<string, string>
    metadata:              Record<string, unknown>
    address?:              CheckoutAddress
  }) {
    logger.info('CHECKOUT', 'Criando pagamento', { productId: data.productId, amount: data.amount, currency: data.currency, piId: data.stripePaymentIntentId })
    return prisma.checkoutPayment.upsert({
      where: { stripePaymentIntentId: data.stripePaymentIntentId },
      create: {
        productId:             data.productId,
        amount:                data.amount,
        currency:              data.currency,
        stripePaymentIntentId: data.stripePaymentIntentId,
        customerName:          data.customerName,
        customerEmail:         data.customerEmail,
        customerPhone:         data.customerPhone,
        stripeCustomerId:      data.stripeCustomerId ?? '',
        addressLine1:          data.address?.line1      ?? '',
        addressLine2:          data.address?.line2      ?? '',
        addressCity:           data.address?.locality && data.address?.city
                                 ? `${data.address.locality}, ${data.address.city}`
                                 : (data.address?.locality ?? data.address?.city ?? ''),
        addressPostalCode:     data.address?.postalCode ?? '',
        addressCountry:        data.address?.country    ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        urlParams:             data.urlParams as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata:              data.metadata as any,
        status:                'pending',
      },
      update: {
        amount:                data.amount,
        customerName:          data.customerName || undefined,
        customerEmail:         data.customerEmail || undefined,
        customerPhone:         data.customerPhone || undefined,
        stripeCustomerId:      data.stripeCustomerId || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        urlParams:             data.urlParams as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata:              data.metadata as any,
      },
    })
  },

  async updatePaymentStatus(
    stripePaymentIntentId: string,
    status: 'paid' | 'failed' | 'processing',
    paymentMethod?: string,
  ) {
    logger.info('CHECKOUT', 'Status atualizado', { piId: stripePaymentIntentId, status, paymentMethod })
    return prisma.checkoutPayment.updateMany({
      where: { stripePaymentIntentId },
      data:  {
        status,
        ...(paymentMethod ? { paymentMethod } : {}),
      },
    })
  },

  async getPaymentById(id: string): Promise<CheckoutPaymentDetail | null> {
    const r = await prisma.checkoutPayment.findUnique({
      where: { id },
      include: { product: { select: { name: true, successUrl: true } } },
    })
    if (!r) return null
    return {
      id:           r.id,
      status:       r.status as CheckoutPaymentDetail['status'],
      amount:       r.amount,
      currency:     r.currency,
      customerName: r.customerName,
      productName:  r.product.name,
      successUrl:   r.product.successUrl,
      createdAt:    r.createdAt.toISOString(),
    }
  },

  async getPaymentByIntentId(stripePaymentIntentId: string) {
    return prisma.checkoutPayment.findUnique({
      where: { stripePaymentIntentId },
      include: { product: { select: { name: true, successUrl: true, utmifyConfigId: true, utmifyConfigIds: true } } },
    })
  },
}
