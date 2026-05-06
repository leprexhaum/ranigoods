import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const balance = await stripe.balance.retrieve()

    const available = balance.available.reduce((s, b) => s + b.amount, 0)
    const pending   = balance.pending.reduce((s, b) => s + b.amount, 0)
    const currency  = balance.available[0]?.currency?.toUpperCase() ?? 'EUR'

    await prisma.stripeBalance.upsert({
      where:  { id: 1 },
      create: { id: 1, available, pending, currency },
      update: { available, pending, currency },
    })

    return NextResponse.json({ available, pending, currency })
  } catch (err) {
    console.error('[stripe/balance]', err)
    const cached = await prisma.stripeBalance.findUnique({ where: { id: 1 } }).catch(() => null)
    if (cached) return NextResponse.json({ available: cached.available, pending: cached.pending, currency: cached.currency, cached: true })
    return NextResponse.json({ error: 'Erro ao buscar saldo' }, { status: 500 })
  }
}
