import { prisma } from '@/lib/prisma'
import type {
  CheckoutProduct, CheckoutPaymentDetail,
  OrderBump, ShippingOption, CheckoutReview, CheckoutAddress,
} from '@/lib/types/checkout'

function toCheckoutProduct(r: {
  id: string; name: string; description: string; imageUrl: string;
  price: number; currency: string; interval: string;
  slug: string | null; paymentMethods: unknown; shippingOptions: unknown;
  orderBumps: unknown; reviews: unknown; showReviews: boolean;
  checkoutTemplate: string; checkoutLanguage: string; countdownMinutes: number;
  active: boolean; successUrl: string;
  logoUrl: string; brandName: string; legalName: string; requirePhone: boolean; requireAddress: boolean;
}): CheckoutProduct {
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
    checkoutTemplate: (r.checkoutTemplate as CheckoutProduct['checkoutTemplate']) ?? 'single_step',
    checkoutLanguage: r.checkoutLanguage ?? 'pt',
    countdownMinutes: r.countdownMinutes ?? 15,
    active:           r.active ?? true,
    successUrl:       r.successUrl ?? '',
    logoUrl:          r.logoUrl ?? '',
    brandName:        r.brandName ?? '',
    legalName:        r.legalName ?? '',
    requirePhone:     r.requirePhone ?? false,
    requireAddress:   r.requireAddress ?? false,
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
      },
    })
    return r ? toCheckoutProduct(r) : null
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
    return prisma.checkoutPayment.create({
      data: {
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
        addressCity:           data.address?.city       ?? '',
        addressPostalCode:     data.address?.postalCode ?? '',
        addressCountry:        data.address?.country    ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        urlParams:             data.urlParams as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata:              data.metadata as any,
        status:                'pending',
      },
    })
  },

  async updatePaymentStatus(
    stripePaymentIntentId: string,
    status: 'paid' | 'failed' | 'processing',
    paymentMethod?: string,
  ) {
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
      include: { product: { select: { name: true, successUrl: true, utmifyConfigId: true } } },
    })
  },
}
