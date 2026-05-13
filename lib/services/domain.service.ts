import { prisma } from '@/lib/prisma'
import { cloudflareService } from './cloudflare.service'
import { logger } from '@/lib/logger'

export type DomainStatus = 'pending_ns' | 'propagating' | 'configuring' | 'active' | 'failed'

export const ALLOWED_SUBDOMAINS = ['checkout', 'pay', 'seguro', 'comprar', 'pedido', 'loja'] as const
export type AllowedSubdomain = typeof ALLOWED_SUBDOMAINS[number]

export interface CustomDomainRecord {
  id:            string
  userId:        string
  domain:        string
  status:        DomainStatus
  failReason:    string
  cfZoneId:      string
  cfNameservers: string[]
  subdomains:    string[]
  verifiedAt:    string | null
  createdAt:     string
}

function toRecord(r: {
  id: string; userId: string; domain: string; status: string;
  failReason: string; cfZoneId: string; cfNameservers: unknown; subdomains?: unknown;
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
    subdomains:    (r.subdomains as string[]) ?? [],
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
    logger.info('DOMÍNIO', 'Zona Cloudflare criada', { domain: clean, zoneId, nameservers })

    const row = await prisma.customDomain.create({
      data: {
        userId,
        domain: clean,
        status: 'pending_ns',
        cfZoneId: zoneId,
        cfNameservers: nameservers,
      },
    })
    logger.info('DOMÍNIO', 'Domínio adicionado', { domain: clean, userId, status: 'pending_ns' })
    return toRecord(row)
  },

  async verify(id: string, userId: string): Promise<CustomDomainRecord | null> {
    const row = await prisma.customDomain.findFirst({ where: { id, userId } })
    if (!row) return null
    if (row.status === 'active') return toRecord(row)

    logger.info('DOMÍNIO', 'Verificação de nameservers', { domain: row.domain, status: row.status })

    try {
      const zoneStatus = await cloudflareService.checkZoneStatus(row.cfZoneId)

      if (zoneStatus === 'active') {
        // Zona ativa — configurar Worker + DNS + SSL
        await prisma.customDomain.update({
          where: { id },
          data: { status: 'configuring', failReason: '' },
        })

        try {
          await cloudflareService.setupDomain(row.cfZoneId, row.domain)
          const final = await prisma.customDomain.update({
            where: { id },
            data: { status: 'active', verifiedAt: new Date(), failReason: '' },
          })
          logger.info('DOMÍNIO', 'Domínio verificado com sucesso', { domain: row.domain, zoneId: row.cfZoneId })
          return toRecord(final)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erro ao configurar domínio'
          const failed = await prisma.customDomain.update({
            where: { id },
            data: { status: 'failed', failReason: msg },
          })
          logger.error('DOMÍNIO', 'Erro na API Cloudflare', { domain: row.domain, operacao: 'setup_domain', error: msg })
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
      logger.info('DOMÍNIO', 'Verificação de nameservers', { domain: row.domain, status: 'aguardando_propagacao' })
      return toRecord(updated)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao verificar DNS'
      const failed = await prisma.customDomain.update({
        where: { id },
        data: { status: 'failed', failReason: msg },
      })
      logger.warn('DOMÍNIO', 'Verificação falhada', { domain: row.domain, motivo: msg })
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
    logger.info('DOMÍNIO', 'Domínio removido', { domain: row.domain, userId })
    return result.count > 0
  },

  async getByDomain(domain: string): Promise<CustomDomainRecord | null> {
    const row = await prisma.customDomain.findUnique({ where: { domain } })
    return row ? toRecord(row) : null
  },

  async updateSubdomains(id: string, userId: string, subdomains: string[]): Promise<CustomDomainRecord | null> {
    const row = await prisma.customDomain.findFirst({ where: { id, userId } })
    if (!row) return null
    if (row.status !== 'active') {
      throw new Error('Domínio precisa estar ativo para configurar subdomínios')
    }

    // Validar que todos estão na lista permitida
    const invalid = subdomains.filter(s => !ALLOWED_SUBDOMAINS.includes(s as AllowedSubdomain))
    if (invalid.length > 0) {
      throw new Error(`Subdomínios inválidos: ${invalid.join(', ')}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = ((row as any).subdomains as string[]) ?? []
    const toAdd = subdomains.filter(s => !current.includes(s))
    const toRemove = current.filter(s => !subdomains.includes(s))
    const toKeep = subdomains.filter(s => current.includes(s))

    // Criar novos subdomínios no Cloudflare
    for (const sub of toAdd) {
      try {
        await cloudflareService.createSubdomainRecords(row.cfZoneId, row.domain, sub)
      } catch (err) {
        logger.warn('DOMÍNIO', 'Erro ao criar subdomínio (pode já existir)', { domain: row.domain, subdomain: sub, error: err instanceof Error ? err.message : String(err) })
      }
    }

    // Garantir infraestrutura dos subdomínios que já existiam (reconciliação)
    for (const sub of toKeep) {
      try {
        await cloudflareService.ensureSubdomainInfra(row.cfZoneId, row.domain, sub)
      } catch (err) {
        logger.warn('DOMÍNIO', 'Erro ao reconciliar subdomínio', { domain: row.domain, subdomain: sub, error: err instanceof Error ? err.message : String(err) })
      }
    }

    // Remover subdomínios antigos do Cloudflare
    for (const sub of toRemove) {
      try {
        await cloudflareService.deleteSubdomainRecords(row.cfZoneId, row.domain, sub)
      } catch (err) {
        logger.warn('DOMÍNIO', 'Erro ao remover subdomínio', { domain: row.domain, subdomain: sub, error: err instanceof Error ? err.message : String(err) })
      }
    }

    // Atualizar banco
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma.customDomain as any).update({
      where: { id },
      data: { subdomains },
    })

    logger.info('DOMÍNIO', 'Subdomínios atualizados', { domain: row.domain, subdomains, adicionados: toAdd, removidos: toRemove, reconciliados: toKeep })
    return toRecord(updated)
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
