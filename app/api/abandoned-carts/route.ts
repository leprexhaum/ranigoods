import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { abandonedCartService } from '@/lib/services/abandoned-cart.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sp     = req.nextUrl.searchParams
  const status = sp.get('status') ?? undefined
  const search = sp.get('search') ?? undefined
  const page   = Number(sp.get('page')  ?? 1)
  const limit  = Number(sp.get('limit') ?? 20)

  const result = await abandonedCartService.getAll({ status, search, page, limit })
  return NextResponse.json(result)
}
