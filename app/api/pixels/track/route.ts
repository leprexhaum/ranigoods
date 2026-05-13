import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pixelService } from '@/lib/services/pixel.service'
import { logger } from '@/lib/logger'
import type { TrackEventPayload } from '@/lib/types/pixel'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TrackEventPayload & { event: string; userId?: string; productId?: string }
    const { event, userId, productId, ...payload } = body

    if (!event) {
      return NextResponse.json({ error: 'Campo "event" é obrigatório' }, { status: 400 })
    }

    const ip        = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
    const userAgent = req.headers.get('user-agent') ?? undefined

    let resolvedUserId = userId
    if (!resolvedUserId && productId) {
      const product = await prisma.product.findUnique({ where: { id: productId }, select: { userId: true } })
      resolvedUserId = product?.userId ?? undefined
    }

    const enriched: TrackEventPayload = {
      event,
      ...(payload as Omit<TrackEventPayload, 'event'>),
      userData: { ip, userAgent, ...((payload as TrackEventPayload).userData ?? {}) },
    }

    const logs = await pixelService.trackEvent(event, enriched, resolvedUserId)
    return NextResponse.json({ fired: logs.length, logs })
  } catch (err) {
    logger.error('PIXEL', 'Erro no tracking', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
