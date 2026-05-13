import { NextRequest, NextResponse } from 'next/server'
import { abandonedCartService } from '@/lib/services/abandoned-cart.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const start = Date.now()
  logger.info('CRON', 'Tarefa iniciada', { job: 'abandoned-carts' })
  try {
    const count = await abandonedCartService.detectAbandoned()
    logger.info('CRON', 'Tarefa concluída', { job: 'abandoned-carts', marcados: count, duracao: `${Date.now() - start}ms` })
    return NextResponse.json({ marked: count, ts: new Date().toISOString() })
  } catch (err) {
    logger.error('CRON', 'Erro na execução', { job: 'abandoned-carts', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
