import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const sp        = req.nextUrl.searchParams
  const type      = sp.get('type')      ?? undefined
  const processed = sp.get('processed') ?? undefined
  const objectId  = sp.get('objectId')  ?? undefined
  const page      = Number(sp.get('page')  ?? 1)
  const limit     = Number(sp.get('limit') ?? 30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  if (type)      where.type     = { contains: type, mode: 'insensitive' }
  if (objectId)  where.objectId = { contains: objectId }
  if (processed === 'true')  where.processed = true
  if (processed === 'false') where.processed = false

  const [total, data] = await Promise.all([
    prisma.stripeEvent.count({ where }),
    prisma.stripeEvent.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, type: true, livemode: true, apiVersion: true, objectId: true, objectType: true,
        processed: true, error: true, receivedAt: true,
      },
    }),
  ])

  logger.info('WEBHOOK', 'Stripe events consultados', { username: auth.session.username, type, page, total })
  return NextResponse.json({ data, total, page, limit, pages: Math.ceil(total / limit) })
}
