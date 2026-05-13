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
      select: { domain: true },
    })

    let success = 0
    let failed = 0

    for (const { domain } of activeDomains) {
      try {
        await cloudflareService.redeployWorker(domain)
        success++
      } catch (err) {
        failed++
        logger.warn('CRON', 'Falha ao re-deploy worker', {
          domain,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logger.info('CRON', 'Tarefa concluída', {
      job: 'redeploy-workers',
      total: activeDomains.length,
      success,
      failed,
      duracao: `${Date.now() - start}ms`,
    })

    return NextResponse.json({ total: activeDomains.length, success, failed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    logger.error('CRON', 'Erro na execução', { job: 'redeploy-workers', error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
