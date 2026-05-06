import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const payouts = await prisma.payout.findMany({
      orderBy: { arrivalDate: 'desc' },
      take: 20,
    })
    return NextResponse.json(payouts)
  } catch (err) {
    console.error('[payouts]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
