import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { domainService, ALLOWED_SUBDOMAINS } from '@/lib/services/domain.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const domains = await domainService.list(auth.session.userId)
  const domain = domains.find(d => d.id === params.id)
  if (!domain) return NextResponse.json({ error: 'Domínio não encontrado' }, { status: 404 })

  return NextResponse.json({
    subdomains: domain.subdomains,
    available: ALLOWED_SUBDOMAINS,
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as { subdomains?: string[] }
  if (!Array.isArray(body.subdomains)) {
    return NextResponse.json({ error: 'subdomains deve ser um array' }, { status: 400 })
  }

  try {
    const updated = await domainService.updateSubdomains(params.id, auth.session.userId, body.subdomains)
    if (!updated) return NextResponse.json({ error: 'Domínio não encontrado' }, { status: 404 })
    logger.info('DOMÍNIO', 'Subdomínios atualizados via API', { userId: auth.session.userId, domainId: params.id, subdomains: body.subdomains })
    return NextResponse.json(updated)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar subdomínios'
    logger.error('DOMÍNIO', 'Erro ao atualizar subdomínios', { userId: auth.session.userId, domainId: params.id, error: msg })
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
