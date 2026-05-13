import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '50')
  const logs = await pixelService.getLogs(auth.session.userId, limit)
  logger.info('PIXEL', 'Logs consultados', { username: auth.session.username, limit, total: logs.length })
  return NextResponse.json(logs)
}

export async function DELETE() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  await pixelService.clearLogs(auth.session.userId)
  logger.info('PIXEL', 'Logs limpos', { username: auth.session.username })
  return NextResponse.json({ cleared: true })
}
