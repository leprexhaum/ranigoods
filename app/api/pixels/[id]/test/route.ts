import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body      = await req.json().catch(() => ({})) as { event?: string }
  const eventName = body.event ?? 'Purchase'
  logger.info('PIXEL', 'Teste de disparo', { username: auth.session.username, pixelId: params.id, event: eventName })
  const result    = await pixelService.testEvent(params.id, auth.session.userId, eventName)
  return NextResponse.json(result)
}
