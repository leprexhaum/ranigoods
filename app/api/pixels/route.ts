import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(await pixelService.getAll(auth.session.userId))
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    if (!body.platform) return NextResponse.json({ error: 'platform é obrigatório' }, { status: 400 })

    const pixel = await pixelService.create(auth.session.userId, {
      platform:        body.platform,
      name:            body.name            ?? '',
      pixelId:         body.pixelId         ?? '',
      accessToken:     body.accessToken     ?? '',
      testEventCode:   body.testEventCode   ?? '',
      conversionLabel: body.conversionLabel ?? '',
      enabled:         body.enabled         ?? true,
    })
    logger.info('PIXEL', 'Pixel criado', { userId: auth.session.userId, platform: body.platform, configId: pixel.id })
    return NextResponse.json(pixel, { status: 201 })
  } catch (err) {
    logger.error('PIXEL', 'Erro ao criar pixel', { userId: auth.session.userId, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
