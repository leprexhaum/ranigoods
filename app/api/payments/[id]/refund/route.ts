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

    // Verificar que o CheckoutPayment pertence ao userId
    const cp = await prisma.checkoutPayment.findFirst({
      where: { id: params.id, product: { userId: auth.session.userId } },
    })
    if (!cp) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    if (cp.status === 'refunded') return NextResponse.json({ error: 'Já reembolsado' }, { status: 409 })
    if (!cp.stripePaymentIntentId) return NextResponse.json({ error: 'Payment Intent não encontrado' }, { status: 404 })

    const pi = await stripe.paymentIntents.retrieve(cp.stripePaymentIntentId, { expand: ['latest_charge'] })
    const charge = pi.latest_charge as Stripe.Charge | null
    if (!charge) return NextResponse.json({ error: 'Charge não encontrado' }, { status: 404 })

    const refundAmount = amount && amount > 0 ? amount : undefined

    const refund = await stripe.refunds.create({
      charge: charge.id,
      ...(refundAmount ? { amount: refundAmount } : {}),
    })

    await prisma.checkoutPayment.update({
      where: { id: params.id },
      data:  { status: 'refunded', refundedAmount: refund.amount },
    })

    return NextResponse.json({ success: true, refundId: refund.id, amount: refund.amount })
  } catch (err) {
    console.error('[refund]', err)
    const msg = err instanceof Error ? err.message : 'Erro ao processar reembolso'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
