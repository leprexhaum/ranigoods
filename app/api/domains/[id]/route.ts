import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { domainService } from '@/lib/services/domain.service'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const ok = await domainService.delete(params.id, auth.session.userId)
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true })
}
