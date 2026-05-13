import { NextRequest, NextResponse } from 'next/server'
import { dashboardService } from '@/lib/services/dashboard.service'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const sp    = new URL(req.url).searchParams
    const start = sp.get('start') ?? undefined
    const end   = sp.get('end')   ?? undefined
    const { userId } = auth.session

    const [stats, sales, payments] = await Promise.all([
      dashboardService.getStats(userId, start, end),
      dashboardService.getSales(userId, start, end),
      dashboardService.getRecentPayments(userId, start, end),
    ])

    logger.info('DASHBOARD', 'Métricas carregadas', { username: auth.session.username, periodo: `${start ?? 'inicio'}..${end ?? 'hoje'}`, receita: stats.receitaTotal, vendas: stats.vendas })
    return NextResponse.json({ stats, sales, payments })
  } catch (err) {
    logger.error('DASHBOARD', 'Erro ao carregar métricas', { username: auth.session.username, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
