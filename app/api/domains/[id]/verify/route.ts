import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { domainService } from '@/lib/services/domain.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const domain = await domainService.verify(params.id, auth.session.userId)
  if (!domain) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  logger.info('DOMÍNIO', 'Verificação solicitada via API', { username: auth.session.username, domainId: params.id })
  return NextResponse.json(domain)
}
