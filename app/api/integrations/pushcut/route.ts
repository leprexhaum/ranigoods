import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth
  const configs = await prisma.pushcutConfig.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'asc' },
  })
  logger.info('PUSHCUT', 'Listagem consultada', { userId: session.userId, total: configs.length })
  return NextResponse.json(configs)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth
  const body = await req.json() as { name?: string; webhookUrl?: string; events?: string[]; enabled?: boolean }
  if (!body.webhookUrl?.trim()) return NextResponse.json({ error: 'webhookUrl é obrigatório' }, { status: 400 })
  const config = await prisma.pushcutConfig.create({
    data: {
      userId:     session.userId,
      name:       body.name?.trim() ?? '',
      webhookUrl: body.webhookUrl.trim(),
      events:     (body.events ?? ['payment.succeeded']) as never,
      enabled:    body.enabled ?? true,
    },
  })
  logger.info('PUSHCUT', 'Config criada', { userId: session.userId, configId: config.id })
  return NextResponse.json(config, { status: 201 })
}
