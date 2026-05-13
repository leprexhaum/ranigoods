import { NextResponse } from 'next/server'
import { destroySession, getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getSession()
  await destroySession()
  logger.info('AUTH', 'Sessão encerrada', { userId: session?.userId ?? 'unknown' })
  return NextResponse.json({ ok: true })
}
