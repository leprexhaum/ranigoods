import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const ev = await prisma.stripeEvent.findUnique({ where: { id: params.id } })
  if (!ev) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  logger.info('WEBHOOK', 'Stripe event detalhe', { username: auth.session.username, eventId: params.id, type: ev.type })
  return NextResponse.json(ev)
}
