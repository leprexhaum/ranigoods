import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { abandonedCartService } from '@/lib/services/abandoned-cart.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sp     = req.nextUrl.searchParams
  const status = sp.get('status') ?? undefined
  const search = sp.get('search') ?? undefined
  const page   = Number(sp.get('page')  ?? 1)
  const limit  = Number(sp.get('limit') ?? 20)

  const result = await abandonedCartService.getAll({
    userId: auth.session.userId,
    status,
    search,
    page,
    limit,
  })
  logger.info('CHECKOUT', 'Carrinhos abandonados consultados', { username: auth.session.username, status, page, total: result.total })
  return NextResponse.json(result)
}
