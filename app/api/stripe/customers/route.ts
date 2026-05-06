import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(req.url)
    const page   = Math.max(1, Number(searchParams.get('page')  ?? '1'))
    const limit  = Math.min(100, Number(searchParams.get('limit') ?? '20'))
    const search = searchParams.get('search') ?? ''
    const skip   = (page - 1) * limit

    const where = search ? {
      OR: [
        { name:  { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}

    const [data, total] = await Promise.all([
      prisma.stripeCustomer.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.stripeCustomer.count({ where }),
    ])

    return NextResponse.json({ data, total, pages: Math.ceil(total / limit), page })
  } catch (err) {
    console.error('[stripe/customers]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
