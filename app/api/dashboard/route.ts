import { NextRequest, NextResponse } from 'next/server'
import { dashboardService } from '@/lib/services/dashboard.service'

export async function GET(req: NextRequest) {
  const sp    = new URL(req.url).searchParams
  const start = sp.get('start') ?? undefined
  const end   = sp.get('end')   ?? undefined

  const [stats, sales, payments] = await Promise.all([
    dashboardService.getStats(start, end),
    dashboardService.getSales(start, end),
    dashboardService.getRecentPayments(start, end),
  ])

  return NextResponse.json({ stats, sales, payments })
}
