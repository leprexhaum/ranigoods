import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth
  const cfg = await prisma.utmifyConfig.findUnique({ where: { id: params.id } })
  if (!cfg || cfg.userId !== session.userId) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  const body = await req.json() as { name?: string; apiToken?: string; enabled?: boolean }
  const updated = await prisma.utmifyConfig.update({
    where: { id: params.id },
    data: {
      ...(body.name     !== undefined ? { name:     body.name.trim()     } : {}),
      ...(body.apiToken !== undefined ? { apiToken: body.apiToken.trim() } : {}),
      ...(body.enabled  !== undefined ? { enabled:  body.enabled         } : {}),
    },
  })
  logger.info('UTMIFY', 'Config atualizada', { username: session.username, configId: params.id })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth
  const cfg = await prisma.utmifyConfig.findUnique({ where: { id: params.id } })
  if (!cfg || cfg.userId !== session.userId) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  await prisma.utmifyConfig.delete({ where: { id: params.id } })
  logger.info('UTMIFY', 'Config removida', { username: session.username, configId: params.id })
  return NextResponse.json({ ok: true })
}
