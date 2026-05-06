import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  let updated = 0
  let errors  = 0

  try {
    // Buscar CheckoutPayments sem card info mas com stripePaymentIntentId
    const payments = await prisma.checkoutPayment.findMany({
      where: {
        stripePaymentIntentId: { not: null },
        cardLast4: '',
      },
      select: { id: true, stripePaymentIntentId: true },
      take: 100,
    })

    for (const cp of payments) {
      if (!cp.stripePaymentIntentId) continue
      try {
        const charges = await stripe.charges.list({
          payment_intent: cp.stripePaymentIntentId,
          limit: 1,
          expand: ['data.balance_transaction'],
        })
        const charge = charges.data[0]
        if (!charge) continue

        const card    = charge.payment_method_details?.card
        const outcome = charge.outcome
        const bt      = charge.balance_transaction as Stripe.BalanceTransaction | null

        await prisma.checkoutPayment.update({
          where: { id: cp.id },
          data: {
            cardLast4:   card?.last4    ?? '',
            cardBrand:   card?.brand    ?? '',
            cardCountry: card?.country  ?? '',
            riskLevel:   outcome?.risk_level ?? '',
            fee:         bt?.fee ?? 0,
            net:         bt?.net ?? 0,
            balanceTxId: bt?.id  ?? '',
          },
        })
        updated++
      } catch {
        errors++
      }
    }

    return NextResponse.json({ updated, errors, total: payments.length })
  } catch (err) {
    console.error('[stripe/backfill]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
