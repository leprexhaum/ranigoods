import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const sp     = new URL(req.url).searchParams
    const status = sp.get('status') ?? 'all'
    const search = sp.get('search') ?? ''
    const start  = sp.get('start')  ?? ''
    const end    = sp.get('end')    ?? ''
    const page   = parseInt(sp.get('page')  ?? '1')
    const limit  = parseInt(sp.get('limit') ?? '12')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { userId: auth.session.userId }

    if (status !== 'all') where.status = status
    if (start || end) {
      where.createdAt = {
        ...(start ? { gte: new Date(start) } : {}),
        ...(end   ? { lte: new Date(end + 'T23:59:59Z') } : {}),
      }
    }
    if (search) {
      where.OR = [
        { customerName:  { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { id:            { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, rows] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: { items: true },
      }),
    ])

    logger.info('PEDIDO', 'Listagem consultada', { username: auth.session.username, status, pagina: page, resultados: `${rows.length}/${total}` })
    return NextResponse.json({
      data:  rows,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  } catch (err) {
    logger.error('PEDIDO', 'Erro ao listar pedidos', { username: auth.session.username, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
