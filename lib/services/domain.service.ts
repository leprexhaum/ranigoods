import { prisma } from '@/lib/prisma'
import { cloudflareService } from './cloudflare.service'

export type DomainStatus = 'pending_ns' | 'propagating' | 'configuring' | 'active' | 'failed'

export interface CustomDomainRecord {
  id:            string
  userId:        string
  domain:        string
  status:        DomainStatus
  failReason:    string
  cfZoneId:      string
  cfNameservers: string[]
  verifiedAt:    string | null
  createdAt:     string
}

function toRecord(r: {
  id: string; userId: string; domain: string; status: string;
  failReason: string; cfZoneId: string; cfNameservers: unknown;
  verifiedAt: Date | null; createdAt: Date;
}): CustomDomainRecord {
  return {
    id:            r.id,
    userId:        r.userId,
    domain:        r.domain,
    status:        r.status as DomainStatus,
    failReason:    r.failReason,
    cfZoneId:      r.cfZoneId,
    cfNameservers: (r.cfNameservers as string[]) ?? [],
    verifiedAt:    r.verifiedAt?.toISOString() ?? null,
    createdAt:     r.createdAt.toISOString(),
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

    // Cria zona no Cloudflare
    const { zoneId, nameservers } = await cloudflareService.createZone(clean)

    const row = await prisma.customDomain.create({
      data: {
        userId,
        domain: clean,
        status: 'pending_ns',
        cfZoneId: zoneId,
        cfNameservers: nameservers,
      },
    })
    return toRecord(row)
  },

  async verify(id: string, userId: string): Promise<CustomDomainRecord | null> {
    const row = await prisma.customDomain.findFirst({ where: { id, userId } })
    if (!row) return null
    if (row.status === 'active') return toRecord(row)

    try {
      const zoneStatus = await cloudflareService.checkZoneStatus(row.cfZoneId)

      if (zoneStatus === 'active') {
        // Zona ativa — configurar Worker + DNS + SSL
        const updated = await prisma.customDomain.update({
          where: { id },
          data: { status: 'configuring', failReason: '' },
        })

        try {
          await cloudflareService.setupDomain(row.cfZoneId, row.domain)
          const final = await prisma.customDomain.update({
            where: { id },
            data: { status: 'active', verifiedAt: new Date(), failReason: '' },
          })
          return toRecord(final)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro ao configurar domínio'
          const failed = await prisma.customDomain.update({
            where: { id },
            data: { status: 'failed', failReason: msg },
          })
          return toRecord(failed)
        }
      }

      // Zona ainda pendente
      const newStatus = row.status === 'pending_ns' ? 'propagating' : row.status
      const updated = await prisma.customDomain.update({
        where: { id },
        data: {
          status: newStatus as string,
          failReason: '',
        },
      })
      return toRecord(updated)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao verificar DNS'
      const failed = await prisma.customDomain.update({
        where: { id },
        data: { status: 'failed', failReason: msg },
      })
      return toRecord(failed)
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    const row = await prisma.customDomain.findFirst({ where: { id, userId } })
    if (!row) return false

    // Remove zona e worker do Cloudflare
    try {
      await cloudflareService.deleteWorker(row.domain)
      await cloudflareService.deleteZone(row.cfZoneId)
    } catch {
      // Continua mesmo se falhar no Cloudflare
    }

    const result = await prisma.customDomain.deleteMany({ where: { id, userId } })
    return result.count > 0
  },

  async getByDomain(domain: string): Promise<CustomDomainRecord | null> {
    const row = await prisma.customDomain.findUnique({ where: { domain } })
    return row ? toRecord(row) : null
  },

  async checkPropagation(): Promise<{ checked: number; activated: number }> {
    const pending = await prisma.customDomain.findMany({
      where: {
        status: { in: ['pending_ns', 'propagating'] },
      },
      take: 5,
      orderBy: { updatedAt: 'asc' },
    })

    let activated = 0

    for (const row of pending) {
      try {
        const zoneStatus = await cloudflareService.checkZoneStatus(row.cfZoneId)

        if (zoneStatus === 'active') {
          await prisma.customDomain.update({
            where: { id: row.id },
            data: { status: 'configuring' },
          })

          try {
            await cloudflareService.setupDomain(row.cfZoneId, row.domain)
            await prisma.customDomain.update({
              where: { id: row.id },
              data: { status: 'active', verifiedAt: new Date(), failReason: '' },
            })
            activated++
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao configurar'
            await prisma.customDomain.update({
              where: { id: row.id },
              data: { status: 'failed', failReason: msg },
            })
          }
        } else if (row.status === 'pending_ns') {
          await prisma.customDomain.update({
            where: { id: row.id },
            data: { status: 'propagating' },
          })
        }
      } catch {
        // Skip this domain, try next
      }
    }

    return { checked: pending.length, activated }
  },
}
