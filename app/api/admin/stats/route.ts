import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { adminService } from '@/lib/services/admin.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const sp = new URL(req.url).searchParams
  const start = sp.get('start') ?? undefined
  const end = sp.get('end') ?? undefined

  try {
    const stats = await adminService.getPlatformStats(start, end)
    return NextResponse.json(stats)
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar estatísticas' }, { status: 500 })
  }
}
