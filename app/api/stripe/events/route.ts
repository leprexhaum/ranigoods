import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, Number(searchParams.get('page')  ?? '1'))
    const limit = Math.min(100, Number(searchParams.get('limit') ?? '50'))
    const skip  = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.stripeEvent.findMany({
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, type: true, livemode: true,
          objectId: true, objectType: true,
          processed: true, error: true, receivedAt: true,
        },
      }),
      prisma.stripeEvent.count(),
    ])

    return NextResponse.json({ data, total, pages: Math.ceil(total / limit), page })
  } catch (err) {
    console.error('[stripe/events]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
