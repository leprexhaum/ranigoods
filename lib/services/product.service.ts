import { prisma } from '@/lib/prisma'

export interface Product {
  id: string
  name: string
  price: number
  interval: string
  sales: number
  revenue: number
  status: 'active' | 'archived'
  stripeId: string
}

function toProduct(r: {
  id: string; name: string; price: number; interval: string;
  sales: number; revenue: bigint; status: string; stripeId: string;
}): Product {
  return {
    id:       r.id,
    name:     r.name,
    price:    r.price,
    interval: r.interval,
    sales:    r.sales,
    revenue:  Number(r.revenue),
    status:   r.status as Product['status'],
    stripeId: r.stripeId,
  }
}

export const productService = {
  async getAll(status?: 'active' | 'archived'): Promise<Product[]> {
    const rows = await prisma.product.findMany({
      where: status ? { status } : undefined,
      orderBy: { name: 'asc' },
    })
    return rows.map(toProduct)
  },

  async getById(id: string): Promise<Product | null> {
    const r = await prisma.product.findUnique({ where: { id } })
    return r ? toProduct(r) : null
  },

  async create(data: Omit<Product, 'id'>): Promise<Product> {
    const r = await prisma.product.create({
      data: {
        id:       `prod_${Date.now()}`,
        name:     data.name,
        price:    data.price,
        interval: data.interval,
        sales:    data.sales ?? 0,
        revenue:  BigInt(data.revenue ?? 0),
        status:   data.status ?? 'active',
        stripeId: data.stripeId ?? '',
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
          revenue: data.revenue !== undefined ? BigInt(data.revenue) : undefined,
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
}
