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
    const sellers = await adminService.listSellers(start, end)
    return NextResponse.json(sellers)
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao listar sellers' }, { status: 500 })
  }
}
