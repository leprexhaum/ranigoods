import { NextRequest, NextResponse } from 'next/server'
import { dashboardService } from '@/lib/services/dashboard.service'
import { requireAuth } from '@/lib/api-auth'

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

    return NextResponse.json({ stats, sales, payments })
  } catch (err) {
    console.error('[dashboard]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
