import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { funnelService } from '@/lib/services/funnel.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const funnel = await funnelService.update(params.id, auth.session.userId, body)
  if (!funnel) return NextResponse.json({ error: 'Funil não encontrado' }, { status: 404 })
  logger.info('UPSELL', 'Funil atualizado', { username: auth.session.username, funnelId: params.id })
  return NextResponse.json(funnel)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const ok = await funnelService.delete(params.id, auth.session.userId)
  if (!ok) return NextResponse.json({ error: 'Funil não encontrado' }, { status: 404 })
  logger.info('UPSELL', 'Funil removido', { username: auth.session.username, funnelId: params.id })
  return NextResponse.json({ success: true })
}
