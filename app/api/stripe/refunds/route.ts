import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, Number(searchParams.get('page')  ?? '1'))
    const limit = Math.min(100, Number(searchParams.get('limit') ?? '20'))
    const skip  = (page - 1) * limit

    const [data, total] = await Promise.all([
      prisma.stripeRefund.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.stripeRefund.count(),
    ])

    return NextResponse.json({ data, total, pages: Math.ceil(total / limit), page })
  } catch (err) {
    logger.error('STRIPE-API', 'Erro ao listar refunds', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
