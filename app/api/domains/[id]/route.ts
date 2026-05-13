import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { domainService } from '@/lib/services/domain.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const ok = await domainService.delete(params.id, auth.session.userId)
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  logger.info('DOMÍNIO', 'Domínio removido via API', { userId: auth.session.userId, domainId: params.id })
  return NextResponse.json({ success: true })
}
