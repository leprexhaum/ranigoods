import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'
import type { TrackEventPayload } from '@/lib/types/pixel'

export async function POST(req: NextRequest) {
  const body = await req.json() as TrackEventPayload & { event: string }
  const { event, ...payload } = body

  if (!event) {
    return NextResponse.json({ error: 'Campo "event" é obrigatório' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
  const userAgent = req.headers.get('user-agent') ?? undefined

  const enriched: TrackEventPayload = {
    event,
    ...(payload as Omit<TrackEventPayload, 'event'>),
    userData: { ip, userAgent, ...((payload as TrackEventPayload).userData ?? {}) },
  }

  const logs = await pixelService.trackEvent(event, enriched)
  return NextResponse.json({ fired: logs.length, logs })
}
