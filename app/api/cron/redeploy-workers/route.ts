import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cloudflareService } from '@/lib/services/cloudflare.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  logger.info('CRON', 'Tarefa iniciada', { job: 'redeploy-workers' })

  try {
    const activeDomains = await prisma.customDomain.findMany({
      where: { status: 'active' },
    })

    let success = 0
    let failed = 0
    let routesFixed = 0

    for (const row of activeDomains) {
      try {
        // Re-deploy worker com script atualizado
        await cloudflareService.redeployWorker(row.domain)

        // Garantir infraestrutura de cada subdomínio (CNAME + Worker Route)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subs = ((row as any).subdomains as string[]) ?? []
        for (const sub of subs) {
          try {
            await cloudflareService.ensureSubdomainInfra(row.cfZoneId, row.domain, sub)
            routesFixed++
          } catch (err) {
            logger.warn('CRON', 'Falha ao garantir infra do subdomínio', {
              domain: row.domain,
              subdomain: sub,
              error: err instanceof Error ? err.message : String(err),
            })
          }
        }

        success++
      } catch (err) {
        failed++
        logger.warn('CRON', 'Falha ao re-deploy worker', {
          domain: row.domain,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logger.info('CRON', 'Tarefa concluída', {
      job: 'redeploy-workers',
      total: activeDomains.length,
      success,
      failed,
      routesFixed,
      duracao: `${Date.now() - start}ms`,
    })

    return NextResponse.json({ total: activeDomains.length, success, failed, routesFixed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    logger.error('CRON', 'Erro na execução', { job: 'redeploy-workers', error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
