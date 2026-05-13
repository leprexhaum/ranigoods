import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface FunnelRecord {
  id:          string
  userId:      string
  name:        string
  productId:   string
  upsellId:    string
  upsellPrice: number
  upsellTitle: string
  upsellDesc:  string
  upsellImage: string
  enabled:     boolean
  createdAt:   string
  updatedAt:   string
}

function toRecord(r: {
  id: string; userId: string; name: string; productId: string; upsellId: string;
  upsellPrice: number; upsellTitle: string; upsellDesc: string; upsellImage: string;
  enabled: boolean; createdAt: Date; updatedAt: Date;
}): FunnelRecord {
  return {
    id:          r.id,
    userId:      r.userId,
    name:        r.name,
    productId:   r.productId,
    upsellId:    r.upsellId,
    upsellPrice: r.upsellPrice,
    upsellTitle: r.upsellTitle,
    upsellDesc:  r.upsellDesc,
    upsellImage: r.upsellImage,
    enabled:     r.enabled,
    createdAt:   r.createdAt.toISOString(),
    updatedAt:   r.updatedAt.toISOString(),
  }
}

export const funnelService = {
  async list(userId: string): Promise<FunnelRecord[]> {
    const rows = await prisma.funnel.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toRecord)
  },

  async get(id: string, userId: string): Promise<FunnelRecord | null> {
    const r = await prisma.funnel.findFirst({ where: { id, userId } })
    return r ? toRecord(r) : null
  },

  async getByProductId(productId: string): Promise<FunnelRecord | null> {
    const r = await prisma.funnel.findFirst({
      where: { productId, enabled: true },
    })
    return r ? toRecord(r) : null
  },

  async create(userId: string, data: Omit<FunnelRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<FunnelRecord> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    logger.info('UPSELL', 'Funil criado', { username: user?.username ?? 'unknown', productId: data.productId, upsellId: data.upsellId })
    const r = await prisma.funnel.create({
      data: { userId, ...data },
    })
    return toRecord(r)
  },

  async update(id: string, userId: string, data: Partial<Omit<FunnelRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<FunnelRecord | null> {
    try {
      const r = await prisma.funnel.updateMany({
        where: { id, userId },
        data,
      })
      if (r.count === 0) return null
      return this.get(id, userId)
    } catch {
      return null
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const r = await prisma.funnel.deleteMany({ where: { id, userId } })
    if (r.count > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
      logger.info('UPSELL', 'Funil removido', { funnelId: id, username: user?.username ?? 'unknown' })
    }
    return r.count > 0
  },
}
