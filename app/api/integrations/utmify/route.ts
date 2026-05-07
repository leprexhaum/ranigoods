import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth
  const configs = await prisma.utmifyConfig.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(configs)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth
  const body = await req.json() as { name?: string; apiToken?: string; enabled?: boolean }
  if (!body.apiToken?.trim()) return NextResponse.json({ error: 'apiToken é obrigatório' }, { status: 400 })
  const config = await prisma.utmifyConfig.create({
    data: {
      userId:   session.userId,
      name:     body.name?.trim() ?? '',
      apiToken: body.apiToken.trim(),
      enabled:  body.enabled ?? true,
    },
  })
  return NextResponse.json(config, { status: 201 })
}
