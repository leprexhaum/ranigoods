import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export interface ApiKeyRecord {
  id:        string
  userId:    string
  name:      string
  keyPrefix: string
  key:       string
  createdAt: string
  revokedAt: string | null
}

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export const apiKeyService = {
  async generate(userId: string, name = ''): Promise<{ record: ApiKeyRecord; plaintext: string }> {
    const raw    = `rg_${randomBytes(32).toString('hex')}`
    const hashed = hashKey(raw)
    const prefix = raw.slice(0, 10)

    const row = await prisma.apiKey.create({
      data: { userId, name, key: hashed, keyPrefix: prefix },
    })

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    logger.info('API-KEY', 'Chave gerada', { username: user?.username ?? 'unknown', prefix, nome: name })

    return {
      plaintext: raw,
      record: {
        id:        row.id,
        userId:    row.userId,
        name:      row.name,
        keyPrefix: row.keyPrefix,
        key:       raw,
        createdAt: row.createdAt.toISOString(),
        revokedAt: row.revokedAt?.toISOString() ?? null,
      },
    }
  },

  async list(userId: string): Promise<Omit<ApiKeyRecord, 'key'>[]> {
    const rows = await prisma.apiKey.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(r => ({
      id:        r.id,
      userId:    r.userId,
      name:      r.name,
      keyPrefix: r.keyPrefix,
      createdAt: r.createdAt.toISOString(),
      revokedAt: r.revokedAt?.toISOString() ?? null,
    }))
  },

  async revoke(id: string, userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    const username = user?.username ?? 'unknown'
    try {
      await prisma.apiKey.updateMany({
        where: { id, userId, revokedAt: null },
        data:  { revokedAt: new Date() },
      })
      logger.info('API-KEY', 'Chave revogada via service', { keyId: id, username })
      return true
    } catch {
      logger.error('API-KEY', 'Erro ao revogar chave', { keyId: id, username })
      return false
    }
  },

  async verify(rawKey: string): Promise<string | null> {
    const hashed = hashKey(rawKey)
    const row    = await prisma.apiKey.findUnique({ where: { key: hashed } })
    if (!row || row.revokedAt !== null) return null
    return row.userId
  },
}
