import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const warnings = await prisma.fraudWarning.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(warnings)
  } catch (err) {
    logger.error('STRIPE-API', 'Erro ao listar fraud warnings', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
