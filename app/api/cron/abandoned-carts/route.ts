import { NextRequest, NextResponse } from 'next/server'
import { abandonedCartService } from '@/lib/services/abandoned-cart.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const count = await abandonedCartService.detectAbandoned()
  return NextResponse.json({ marked: count, ts: new Date().toISOString() })
}
