import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { funnelService } from '@/lib/services/funnel.service'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const payment = await prisma.checkoutPayment.findUnique({
    where:  { id: params.id },
    select: {
      id: true, productId: true, status: true, upsellStatus: true,
      stripePaymentIntentId: true, currency: true,
    },
  })

  if (!payment || payment.status !== 'paid') {
    return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
  }
  if (payment.upsellStatus !== 'none') {
    return NextResponse.json({ error: 'Upsell já processado' }, { status: 409 })
  }
  if (!payment.stripePaymentIntentId) {
    return NextResponse.json({ error: 'Payment Intent não encontrado' }, { status: 400 })
  }

  const funnel = await funnelService.getByProductId(payment.productId)
  if (!funnel) return NextResponse.json({ error: 'Funil não encontrado' }, { status: 404 })

  const upsellProduct = await prisma.product.findUnique({
    where:  { id: funnel.upsellId },
    select: { price: true, currency: true, name: true },
  })
  if (!upsellProduct) return NextResponse.json({ error: 'Produto de upsell não encontrado' }, { status: 404 })

  const price = funnel.upsellPrice > 0 ? funnel.upsellPrice : upsellProduct.price

  try {
    // Recuperar o payment method do PI original
    const originalPi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId)
    const paymentMethod = originalPi.payment_method

    if (!paymentMethod || typeof paymentMethod !== 'string') {
      return NextResponse.json({ error: 'Método de pagamento não disponível para 1-click' }, { status: 400 })
    }

    // Criar e confirmar novo PI off-session
    const upsellPi = await stripe.paymentIntents.create({
      amount:         price,
      currency:       payment.currency.toLowerCase(),
      payment_method: paymentMethod,
      confirm:        true,
      off_session:    true,
      metadata: {
        upsellFor:   params.id,
        funnelId:    funnel.id,
        productId:   funnel.upsellId,
        productName: upsellProduct.name,
      },
    })

    // Actualizar o CheckoutPayment original
    await prisma.checkoutPayment.update({
      where: { id: params.id },
      data: {
        upsellStatus: 'accepted',
        upsellAmount: price,
        upsellPiId:   upsellPi.id,
      },
    })

    return NextResponse.json({ success: true, status: upsellPi.status })
  } catch (err) {
    console.error('[upsell/accept]', err)
    // Só marca declined se for erro de cartão recusado (authentication_required, card_declined, etc.)
    // Erros técnicos (timeout, rate limit) não devem bloquear o upsell permanentemente
    const stripeErr = err as { type?: string; code?: string }
    const isCardDeclined =
      stripeErr?.type === 'StripeCardError' ||
      stripeErr?.code === 'card_declined' ||
      stripeErr?.code === 'authentication_required' ||
      stripeErr?.code === 'insufficient_funds'
    if (isCardDeclined) {
      await prisma.checkoutPayment.update({
        where: { id: params.id },
        data:  { upsellStatus: 'declined' },
      })
    }
    return NextResponse.json({ error: 'Falha ao processar upsell' }, { status: 500 })
  }
}
