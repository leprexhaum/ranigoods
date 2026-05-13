import { NextResponse } from 'next/server'
import { domainService } from '@/lib/services/domain.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  logger.info('CRON', 'Tarefa iniciada', { job: 'check-domains' })
  try {
    const result = await domainService.checkPropagation()
    logger.info('CRON', 'Tarefa concluída', { job: 'check-domains', verificados: result.checked, ativados: result.activated, duracao: `${Date.now() - start}ms` })
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    logger.error('CRON', 'Erro na execução', { job: 'check-domains', error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
