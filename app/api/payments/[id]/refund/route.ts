import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { amount } = await req.json() as { amount?: number }

    const payment = await prisma.payment.findUnique({ where: { id: params.id } })
    if (!payment) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    if (payment.status === 'refunded') return NextResponse.json({ error: 'Já reembolsado' }, { status: 409 })

    const pi = await stripe.paymentIntents.retrieve(params.id, { expand: ['latest_charge'] })
    const charge = pi.latest_charge as Stripe.Charge | null
    if (!charge) return NextResponse.json({ error: 'Charge não encontrado' }, { status: 404 })

    const refundAmount = amount && amount > 0 ? amount : undefined

    const refund = await stripe.refunds.create({
      charge: charge.id,
      ...(refundAmount ? { amount: refundAmount } : {}),
    })

    await prisma.payment.update({
      where: { id: params.id },
      data:  { status: 'refunded', refundedAmount: refund.amount },
    })
    await prisma.checkoutPayment.updateMany({
      where: { stripePaymentIntentId: params.id },
      data:  { refundedAmount: refund.amount },
    })

    return NextResponse.json({ success: true, refundId: refund.id, amount: refund.amount })
  } catch (err) {
    console.error('[refund]', err)
    const msg = err instanceof Error ? err.message : 'Erro ao processar reembolso'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
