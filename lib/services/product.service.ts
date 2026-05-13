import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
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
  createdAt:        string
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
  legalName:        string
  successUrl:       string
  metaPixelId:      string
  utmifyConfigId:   string | null
  utmifyConfigIds:  string[]
  stock:            number
  pixelIds:         string[]
}

type ProductRow = {
  id: string; name: string; description: string; imageUrl: string;
  price: number; interval: string; sales: number; revenue: bigint;
  status: string; stripeId: string; slug: string | null; currency: string;
  createdAt: Date;
  defaultShipping: number; paymentMethods: unknown; shippingOptions: unknown;
  orderBumps: unknown; reviews: unknown; showReviews: boolean;
  checkoutTemplate: string; checkoutLanguage: string;
  requirePhone: boolean; requireAddress: boolean;
  logoUrl: string; brandName: string; legalName: string; successUrl: string;
  metaPixelId: string; utmifyConfigId: string | null; utmifyConfigIds: unknown; stock: number; pixelIds: unknown;
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
    createdAt:        r.createdAt.toISOString(),
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
    legalName:        r.legalName,
    successUrl:       r.successUrl,
    metaPixelId:      r.metaPixelId,
    utmifyConfigId:   r.utmifyConfigId ?? null,
    utmifyConfigIds:  (r.utmifyConfigIds as string[]) ?? [],
    stock:            r.stock,
    pixelIds:         (r.pixelIds as string[]) ?? [],
  }
}

export const productService = {
  async getAll(userId: string, status?: 'active' | 'archived'): Promise<Product[]> {
    const rows = await prisma.product.findMany({
      where:   { userId, ...(status ? { status } : {}) },
      orderBy: { name: 'asc' },
    })
    return rows.map(toProduct)
  },

  async getById(id: string): Promise<Product | null> {
    const r = await prisma.product.findUnique({ where: { id } })
    return r ? toProduct(r) : null
  },

  async create(data: Omit<Product, 'id' | 'sales' | 'revenue' | 'createdAt'> & { userId: string }): Promise<Product> {
    const id = `prod_${Date.now()}`
    const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { username: true } })
    logger.info('PRODUTO', 'Criando produto', { id, nome: data.name, username: user?.username ?? 'unknown', preco: data.price })
    const r = await prisma.product.create({
      data: {
        id,
        name:             data.name,
        description:      data.description ?? '',
        imageUrl:         data.imageUrl ?? '',
        price:            data.price,
        interval:         data.interval,
        sales:            0,
        revenue:          BigInt(0),
        status:           data.status ?? 'active',
        stripeId:         data.stripeId ?? '',
        slug:             data.slug || id,
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
        checkoutTemplate: data.checkoutTemplate ?? 'stripe_split',
        checkoutLanguage: data.checkoutLanguage ?? 'pt',
        requirePhone:     data.requirePhone ?? false,
        requireAddress:   data.requireAddress ?? false,
        logoUrl:          data.logoUrl ?? '',
        brandName:        data.brandName ?? '',
        legalName:        data.legalName ?? '',
        metaPixelId:      data.metaPixelId ?? '',
        utmifyConfigId:   data.utmifyConfigId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        utmifyConfigIds:  (data.utmifyConfigIds ?? []) as any,
        stock:            data.stock ?? -1,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pixelIds:         (data.pixelIds ?? []) as any,
        userId:           data.userId,
      },
    })
    return toProduct(r)
  },

  async update(id: string, data: Partial<Omit<Product, 'id'>>): Promise<Product | null> {
    try {
      logger.info('PRODUTO', 'Atualizando produto', { productId: id, campos: Object.keys(data).join(',') })
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          utmifyConfigIds: data.utmifyConfigIds !== undefined ? (data.utmifyConfigIds as any) : undefined,
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
      logger.info('PRODUTO', 'Produto removido', { productId: id })
      return true
    } catch {
      logger.error('PRODUTO', 'Erro ao remover produto', { productId: id })
      return false
    }
  },

  async duplicate(id: string): Promise<Product | null> {
    const original = await prisma.product.findUnique({ where: { id } })
    if (!original) return null
    const newId = `prod_${Date.now()}`
    logger.info('PRODUTO', 'Duplicando produto', { originalId: id, newId })
    const r = await prisma.product.create({
      data: {
        id:               newId,
        slug:             newId,
        name:             `${original.name} (cópia)`,
        description:      original.description,
        imageUrl:         original.imageUrl,
        price:            original.price,
        interval:         original.interval,
        sales:            0,
        revenue:          BigInt(0),
        status:           'active',
        stripeId:         '',
        currency:         original.currency,
        defaultShipping:  original.defaultShipping,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        paymentMethods:   original.paymentMethods as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shippingOptions:  original.shippingOptions as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orderBumps:       original.orderBumps as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reviews:          original.reviews as any,
        showReviews:      original.showReviews,
        checkoutTemplate: original.checkoutTemplate,
        checkoutLanguage: original.checkoutLanguage,
        requirePhone:     original.requirePhone,
        requireAddress:   original.requireAddress,
        logoUrl:          original.logoUrl,
        brandName:        original.brandName,
        legalName:        original.legalName,
        successUrl:       original.successUrl,
        metaPixelId:      original.metaPixelId,
        utmfyApiToken:    original.utmfyApiToken,
        stock:            original.stock,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pixelIds:         original.pixelIds as any,
        active:           true,
        countdownMinutes: original.countdownMinutes,
        userId:           original.userId,
      },
    })
    return toProduct(r)
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

  async incrementSalesByInternalId(id: string, amount: number): Promise<void> {
    await prisma.product.updateMany({
      where: { id },
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
    if (result.count > 0) logger.info('PRODUTO', 'Estoque decrementado', { productId, quantidade: quantity })
    return result.count > 0
  },
}
