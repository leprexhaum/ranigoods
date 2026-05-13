import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { funnelService } from '@/lib/services/funnel.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const funnels = await funnelService.list(auth.session.userId)
  logger.info('UPSELL', 'Listagem de funis', { userId: auth.session.userId, total: funnels.length })
  return NextResponse.json(funnels)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))
  const funnel = await funnelService.create(auth.session.userId, {
    name:        body.name        ?? '',
    productId:   body.productId   ?? '',
    upsellId:    body.upsellId    ?? '',
    upsellPrice: body.upsellPrice ?? 0,
    upsellTitle: body.upsellTitle ?? '',
    upsellDesc:  body.upsellDesc  ?? '',
    upsellImage: body.upsellImage ?? '',
    enabled:     body.enabled     ?? true,
  })
  logger.info('UPSELL', 'Funil criado via API', { userId: auth.session.userId, funnelId: funnel.id })
  return NextResponse.json(funnel, { status: 201 })
}
