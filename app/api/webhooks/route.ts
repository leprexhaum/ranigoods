import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth

  const webhooks = await prisma.outboundWebhook.findMany({
    where:   { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(webhooks)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth

  const body = await req.json() as {
    name:       string
    url:        string
    secret?:    string
    events:     string[]
    productIds: string[]
  }

  if (!body.name?.trim() || !body.url?.trim()) {
    return NextResponse.json({ error: 'name e url são obrigatórios' }, { status: 400 })
  }

  const webhook = await prisma.outboundWebhook.create({
    data: {
      userId:     session.userId,
      name:       body.name.trim(),
      url:        body.url.trim(),
      secret:     body.secret?.trim() || randomBytes(32).toString('hex'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      events:     (body.events ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      productIds: (body.productIds ?? []) as any,
      enabled:    true,
    },
  })
  return NextResponse.json(webhook, { status: 201 })
}
