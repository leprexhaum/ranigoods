import { prisma } from '@/lib/prisma'
import { promises as dns } from 'dns'

const PROXY_HOST = process.env.NEXT_PUBLIC_PROXY_HOST ?? 'proxy.techpags.shop'

export interface CustomDomainRecord {
  id:         string
  userId:     string
  domain:     string
  status:     'pending' | 'active' | 'failed'
  failReason: string
  verifiedAt: string | null
  createdAt:  string
}

function toRecord(r: {
  id: string; userId: string; domain: string; status: string;
  failReason: string; verifiedAt: Date | null; createdAt: Date;
}): CustomDomainRecord {
  return {
    id:         r.id,
    userId:     r.userId,
    domain:     r.domain,
    status:     r.status as CustomDomainRecord['status'],
    failReason: r.failReason,
    verifiedAt: r.verifiedAt?.toISOString() ?? null,
    createdAt:  r.createdAt.toISOString(),
  }
}

async function checkCname(domain: string): Promise<{ ok: boolean; reason: string }> {
  try {
    const addresses = await dns.resolveCname(domain)
    const found = addresses.some(a => a.replace(/\.$/, '') === PROXY_HOST.replace(/\.$/, ''))
    if (found) return { ok: true, reason: '' }
    return { ok: false, reason: `CNAME aponta para ${addresses[0] ?? 'desconhecido'}, esperado ${PROXY_HOST}` }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENODATA' || code === 'ENOTFOUND') {
      return { ok: false, reason: 'Nenhum registro CNAME encontrado' }
    }
    return { ok: false, reason: 'Erro ao consultar DNS' }
  }
}

export const domainService = {
  async list(userId: string): Promise<CustomDomainRecord[]> {
    const rows = await prisma.customDomain.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toRecord)
  },

  async create(userId: string, domain: string): Promise<CustomDomainRecord> {
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    const row = await prisma.customDomain.create({
      data: { userId, domain: clean, status: 'pending' },
    })
    return toRecord(row)
  },

  async verify(id: string, userId: string): Promise<CustomDomainRecord | null> {
    const row = await prisma.customDomain.findFirst({ where: { id, userId } })
    if (!row) return null

    const { ok, reason } = await checkCname(row.domain)

    const updated = await prisma.customDomain.update({
      where: { id },
      data: {
        status:     ok ? 'active' : 'failed',
        failReason: ok ? '' : reason,
        verifiedAt: ok ? new Date() : null,
      },
    })
    return toRecord(updated)
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await prisma.customDomain.deleteMany({ where: { id, userId } })
    return result.count > 0
  },

  async getByDomain(domain: string): Promise<CustomDomainRecord | null> {
    const row = await prisma.customDomain.findUnique({ where: { domain } })
    return row ? toRecord(row) : null
  },
}
