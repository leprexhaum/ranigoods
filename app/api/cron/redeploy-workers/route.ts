import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cloudflareService } from '@/lib/services/cloudflare.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  logger.info('CRON', 'Tarefa iniciada', { job: 'sync-custom-domains' })

  try {
    const activeDomains = await prisma.customDomain.findMany({
      where: { status: 'active' },
    })

    let success = 0
    let failed = 0
    let domainsFixed = 0

    for (const row of activeDomains) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subs = ((row as any).subdomains as string[]) ?? []

        for (const sub of subs) {
          try {
            await cloudflareService.ensureSubdomainInfra(row.cfZoneId, row.domain, sub)
            domainsFixed++
          } catch (err) {
            logger.warn('CRON', 'Falha ao garantir Custom Domain', {
              domain: row.domain,
              subdomain: sub,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }

        // Limpar Worker Routes legadas se existirem
        try {
          await cloudflareService.cleanupLegacyWorkerRoutes(row.cfZoneId)
        } catch {
          // Ignora erros de cleanup
        }

        success++
      } catch (err) {
        failed++
        logger.warn('CRON', 'Falha ao processar domínio', {
          domain: row.domain,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logger.info('CRON', 'Tarefa concluída', {
      job: 'sync-custom-domains',
      total: activeDomains.length,
      success,
      failed,
      domainsFixed,
      duracao: `${Date.now() - start}ms`,
    })

    return NextResponse.json({ total: activeDomains.length, success, failed, domainsFixed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    logger.error('CRON', 'Erro na execução', { job: 'sync-custom-domains', error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
