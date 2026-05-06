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
    const list = await stripe.refunds.list({ limit: 50 })
    for (const r of list.data) {
      const piId = typeof r.payment_intent === 'string' ? r.payment_intent : r.payment_intent?.id ?? ''
      await prisma.stripeRefund.upsert({
        where:  { id: r.id },
        create: {
          id:              r.id,
          chargeId:        typeof r.charge === 'string' ? r.charge : r.charge?.id ?? '',
          paymentIntentId: piId,
          amount:          r.amount,
          currency:        r.currency.toUpperCase(),
          status:          r.status ?? '',
          reason:          r.reason ?? '',
        },
        update: { status: r.status ?? '' },
      })
    }
    const refunds = await prisma.stripeRefund.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json(refunds)
  } catch (err) {
    console.error('[stripe/refunds]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
