import { prisma } from '@/lib/prisma'
import type {
  CheckoutProduct, CheckoutPaymentDetail,
  OrderBump, ShippingOption, CheckoutReview,
} from '@/lib/types/checkout'

function toCheckoutProduct(r: {
  id: string; name: string; price: number; currency: string; interval: string;
  slug: string | null; paymentMethods: unknown; shippingOptions: unknown;
  orderBumps: unknown; reviews: unknown; checkoutTemplate: string; successUrl: string;
}): CheckoutProduct {
  return {
    id:               r.id,
    name:             r.name,
    price:            r.price,
    currency:         r.currency,
    interval:         r.interval,
    slug:             r.slug ?? '',
    paymentMethods:   (r.paymentMethods as string[]) ?? [],
    shippingOptions:  (r.shippingOptions as ShippingOption[]) ?? [],
    orderBumps:       (r.orderBumps as OrderBump[]) ?? [],
    reviews:          (r.reviews as CheckoutReview[]) ?? [],
    checkoutTemplate: (r.checkoutTemplate as CheckoutProduct['checkoutTemplate']) ?? 'single_step',
    successUrl:       r.successUrl ?? '',
  }
}

export const checkoutService = {
  async getProductBySlug(slug: string): Promise<CheckoutProduct | null> {
    const r = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true, name: true, price: true, currency: true, interval: true,
        slug: true, paymentMethods: true, shippingOptions: true,
        orderBumps: true, reviews: true, checkoutTemplate: true, successUrl: true,
      },
    })
    return r ? toCheckoutProduct(r) : null
  },

  async createPayment(data: {
    productId:            string
    amount:               number
    currency:             string
    stripePaymentIntentId: string
    customerName:         string
    customerEmail:        string
    customerPhone:        string
    metadata:             Record<string, unknown>
  }) {
    return prisma.checkoutPayment.create({
      data: {
        productId:             data.productId,
        amount:                data.amount,
        currency:              data.currency,
        stripePaymentIntentId: data.stripePaymentIntentId,
        customerName:          data.customerName,
        customerEmail:         data.customerEmail,
        customerPhone:         data.customerPhone,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata:              data.metadata as any,
        status:                'pending',
      },
    })
  },

  async updatePaymentStatus(
    stripePaymentIntentId: string,
    status: 'paid' | 'failed',
  ) {
    return prisma.checkoutPayment.updateMany({
      where: { stripePaymentIntentId },
      data:  { status },
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
      include: { product: { select: { name: true, successUrl: true, utmfyApiToken: true } } },
    })
  },
}
