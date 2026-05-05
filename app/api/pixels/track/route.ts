import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'
import type { TrackEventPayload } from '@/lib/types/pixel'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TrackEventPayload & { event: string; userId?: string }
    const { event, userId, ...payload } = body

    if (!event) {
      return NextResponse.json({ error: 'Campo "event" é obrigatório' }, { status: 400 })
    }

    const ip        = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
    const userAgent = req.headers.get('user-agent') ?? undefined

    const enriched: TrackEventPayload = {
      event,
      ...(payload as Omit<TrackEventPayload, 'event'>),
      userData: { ip, userAgent, ...((payload as TrackEventPayload).userData ?? {}) },
    }

    const logs = await pixelService.trackEvent(event, enriched, userId)
    return NextResponse.json({ fired: logs.length, logs })
  } catch (err) {
    console.error('[pixels/track]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
