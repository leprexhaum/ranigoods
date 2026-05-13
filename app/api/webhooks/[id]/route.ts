import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth

  const wh = await prisma.outboundWebhook.findUnique({ where: { id: params.id } })
  if (!wh || wh.userId !== session.userId) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }
  return NextResponse.json(wh)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth

  const wh = await prisma.outboundWebhook.findUnique({ where: { id: params.id } })
  if (!wh || wh.userId !== session.userId) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  const body = await req.json() as {
    name?:       string
    url?:        string
    secret?:     string
    events?:     string[]
    productIds?: string[]
    enabled?:    boolean
  }

  const updated = await prisma.outboundWebhook.update({
    where: { id: params.id },
    data: {
      ...(body.name       !== undefined ? { name:       body.name.trim()   } : {}),
      ...(body.url        !== undefined ? { url:        body.url.trim()    } : {}),
      ...(body.secret     !== undefined ? { secret:     body.secret.trim() } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(body.events     !== undefined ? { events:     body.events     as any } : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(body.productIds !== undefined ? { productIds: body.productIds as any } : {}),
      ...(body.enabled    !== undefined ? { enabled:    body.enabled         } : {}),
    },
  })
  logger.info('WEBHOOK-OUT', 'Webhook atualizado', { userId: session.userId, webhookId: params.id })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth

  const wh = await prisma.outboundWebhook.findUnique({ where: { id: params.id } })
  if (!wh || wh.userId !== session.userId) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }

  await prisma.outboundWebhook.delete({ where: { id: params.id } })
  logger.info('WEBHOOK-OUT', 'Webhook removido', { userId: session.userId, webhookId: params.id })
  return NextResponse.json({ ok: true })
}
