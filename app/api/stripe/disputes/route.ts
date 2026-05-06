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
    // Sync from Stripe then return from DB
    const list = await stripe.disputes.list({ limit: 50 })
    for (const d of list.data) {
      const piId = typeof d.payment_intent === 'string' ? d.payment_intent : d.payment_intent?.id ?? ''
      await prisma.stripeDispute.upsert({
        where:  { id: d.id },
        create: {
          id:              d.id,
          chargeId:        typeof d.charge === 'string' ? d.charge : d.charge?.id ?? '',
          paymentIntentId: piId,
          amount:          d.amount,
          currency:        d.currency.toUpperCase(),
          status:          d.status,
          reason:          d.reason,
          evidenceDueBy:   d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000) : null,
        },
        update: { status: d.status },
      })
    }
    const disputes = await prisma.stripeDispute.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
    return NextResponse.json(disputes)
  } catch (err) {
    console.error('[stripe/disputes]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
