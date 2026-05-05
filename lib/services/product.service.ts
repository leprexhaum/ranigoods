import { prisma } from '@/lib/prisma'
import type { ShippingOption, OrderBump, CheckoutReview } from '@/lib/types/checkout'

export interface Product {
  id:               string
  name:             string
  description:      string
  imageUrl:         string
  price:            number
  interval:         string
  sales:            number
  revenue:          number
  status:           'active' | 'archived'
  stripeId:         string
  slug:             string | null
  currency:         string
  defaultShipping:  number
  paymentMethods:   string[]
  shippingOptions:  ShippingOption[]
  orderBumps:       OrderBump[]
  reviews:          CheckoutReview[]
  showReviews:      boolean
  checkoutTemplate: string
  checkoutLanguage: string
  requirePhone:     boolean
  requireAddress:   boolean
  logoUrl:          string
  brandName:        string
  successUrl:       string
  metaPixelId:      string
  utmfyApiToken:    string
  stock:            number
  pixelIds:         string[]
  customDomain:     string
}

type ProductRow = {
  id: string; name: string; description: string; imageUrl: string;
  price: number; interval: string; sales: number; revenue: bigint;
  status: string; stripeId: string; slug: string | null; currency: string;
  defaultShipping: number; paymentMethods: unknown; shippingOptions: unknown;
  orderBumps: unknown; reviews: unknown; showReviews: boolean;
  checkoutTemplate: string; checkoutLanguage: string;
  requirePhone: boolean; requireAddress: boolean;
  logoUrl: string; brandName: string; successUrl: string;
  metaPixelId: string; utmfyApiToken: string; stock: number; pixelIds: unknown; customDomain: string;
}

function toProduct(r: ProductRow): Product {
  return {
    id:               r.id,
    name:             r.name,
    description:      r.description,
    imageUrl:         r.imageUrl,
    price:            r.price,
    interval:         r.interval,
    sales:            r.sales,
    revenue:          Number(r.revenue),
    status:           r.status as Product['status'],
    stripeId:         r.stripeId,
    slug:             r.slug,
    currency:         r.currency,
    defaultShipping:  r.defaultShipping,
    paymentMethods:   (r.paymentMethods as string[]) ?? [],
    shippingOptions:  (r.shippingOptions as ShippingOption[]) ?? [],
    orderBumps:       (r.orderBumps as OrderBump[]) ?? [],
    reviews:          (r.reviews as CheckoutReview[]) ?? [],
    showReviews:      r.showReviews,
    checkoutTemplate: r.checkoutTemplate,
    checkoutLanguage: r.checkoutLanguage,
    requirePhone:     r.requirePhone,
    requireAddress:   r.requireAddress,
    logoUrl:          r.logoUrl,
    brandName:        r.brandName,
    successUrl:       r.successUrl,
    metaPixelId:      r.metaPixelId,
    utmfyApiToken:    r.utmfyApiToken,
    stock:            r.stock,
    pixelIds:         (r.pixelIds as string[]) ?? [],
    customDomain:     r.customDomain,
  }
}

export const productService = {
  async getAll(status?: 'active' | 'archived'): Promise<Product[]> {
    const rows = await prisma.product.findMany({
      where:   status ? { status } : undefined,
      orderBy: { name: 'asc' },
    })
    return rows.map(toProduct)
  },

  async getById(id: string): Promise<Product | null> {
    const r = await prisma.product.findUnique({ where: { id } })
    return r ? toProduct(r) : null
  },

  async create(data: Omit<Product, 'id' | 'sales' | 'revenue'>): Promise<Product> {
    const r = await prisma.product.create({
      data: {
        id:               `prod_${Date.now()}`,
        name:             data.name,
        description:      data.description ?? '',
        imageUrl:         data.imageUrl ?? '',
        price:            data.price,
        interval:         data.interval,
        sales:            0,
        revenue:          BigInt(0),
        status:           data.status ?? 'active',
        stripeId:         data.stripeId ?? '',
        slug:             data.slug || null,
        currency:         data.currency ?? 'EUR',
        defaultShipping:  data.defaultShipping ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        paymentMethods:   (data.paymentMethods ?? []) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shippingOptions:  (data.shippingOptions ?? []) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orderBumps:       (data.orderBumps ?? []) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reviews:          (data.reviews ?? []) as any,
        showReviews:      data.showReviews ?? false,
        checkoutTemplate: data.checkoutTemplate ?? 'single_step',
        checkoutLanguage: data.checkoutLanguage ?? 'pt',
        requirePhone:     data.requirePhone ?? false,
        requireAddress:   data.requireAddress ?? false,
        logoUrl:          data.logoUrl ?? '',
        brandName:        data.brandName ?? '',
        successUrl:       data.successUrl ?? '',
        metaPixelId:      data.metaPixelId ?? '',
        utmfyApiToken:    data.utmfyApiToken ?? '',
        stock:            data.stock ?? -1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pixelIds:         (data.pixelIds ?? []) as any,
        customDomain:     data.customDomain ?? '',
      },
    })
    return toProduct(r)
  },

  async update(id: string, data: Partial<Omit<Product, 'id'>>): Promise<Product | null> {
    try {
      const r = await prisma.product.update({
        where: { id },
        data: {
          ...data,
          slug:            data.slug !== undefined ? (data.slug || null) : undefined,
          revenue:         data.revenue !== undefined ? BigInt(data.revenue) : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          paymentMethods:  data.paymentMethods !== undefined ? (data.paymentMethods as any) : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          shippingOptions: data.shippingOptions !== undefined ? (data.shippingOptions as any) : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          orderBumps:      data.orderBumps !== undefined ? (data.orderBumps as any) : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          reviews:         data.reviews !== undefined ? (data.reviews as any) : undefined,
        },
      })
      return toProduct(r)
    } catch {
      return null
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.product.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  },

  async incrementSales(stripeId: string, amount: number): Promise<void> {
    await prisma.product.updateMany({
      where: { stripeId },
      data: {
        sales:   { increment: 1 },
        revenue: { increment: BigInt(amount) },
      },
    })
  },

  async checkStock(productId: string, quantity: number): Promise<{ available: boolean; stock: number }> {
    const r = await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } })
    if (!r) return { available: false, stock: 0 }
    if (r.stock === -1) return { available: true, stock: -1 }
    return { available: r.stock >= quantity, stock: r.stock }
  },

  async decrementStock(productId: string, quantity: number): Promise<boolean> {
    const result = await prisma.product.updateMany({
      where: { id: productId, OR: [{ stock: { gte: quantity } }, { stock: -1 }] },
      data:  { stock: { decrement: quantity } },
    })
    // Se stock era -1, o decrement vai deixar negativo — corrigir
    await prisma.product.updateMany({
      where: { id: productId, stock: { lt: -1 } },
      data:  { stock: -1 },
    })
    return result.count > 0
  },
}
