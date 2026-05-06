import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const customers = await prisma.stripeCustomer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(customers)
  } catch (err) {
    console.error('[stripe/customers]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
