import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { funnelService } from '@/lib/services/funnel.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// Rate limit: 5 requests por minuto por IP (upsell é ação única)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT   = 5
const WINDOW_MS    = 60_000

function isRateLimited(ip: string): boolean {
  const now  = Date.now()
  const hits = (rateLimitMap.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  hits.push(now)
  rateLimitMap.set(ip, hits)
  return hits.length > RATE_LIMIT
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ip = _req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Demasiadas tentativas. Aguarde um momento.' }, { status: 429 })
  }
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
    // Recuperar o payment method e customer do PI original
    const originalPi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId)
    const paymentMethod = originalPi.payment_method
    const customerId = typeof originalPi.customer === 'string'
      ? originalPi.customer
      : originalPi.customer?.id

    if (!paymentMethod || typeof paymentMethod !== 'string') {
      return NextResponse.json({ error: 'Método de pagamento não disponível para 1-click' }, { status: 400 })
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer não encontrado para cobrança off-session' }, { status: 400 })
    }

    // Criar e confirmar novo PI off-session com customer (obrigatório para SCA/3DS)
    const upsellPi = await stripe.paymentIntents.create({
      amount:         price,
      currency:       payment.currency.toLowerCase(),
      customer:       customerId,
      payment_method: paymentMethod,
      confirm:        true,
      off_session:    true,
      description:    `Upsell: ${upsellProduct.name}`,
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

    logger.info('UPSELL', 'Oferta aceite', { paymentId: params.id, upsellPiId: upsellPi.id, amount: price })

    return NextResponse.json({ success: true, status: upsellPi.status })
  } catch (err) {
    logger.error('UPSELL', 'Erro ao processar aceitação', { paymentId: params.id, error: err instanceof Error ? err.message : String(err) })

    const stripeErr = err as { type?: string; code?: string; raw?: { payment_intent?: { id?: string } } }

    // Se o banco exige 3DS (authentication_required), devolver client_secret
    // para o frontend completar a autenticação on-session
    if (stripeErr?.code === 'authentication_required') {
      const piId = stripeErr.raw?.payment_intent?.id
      if (piId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(piId)
          // Marcar como pending_auth (não declined — ainda pode ser completado)
          await prisma.checkoutPayment.update({
            where: { id: params.id },
            data:  { upsellStatus: 'pending_auth', upsellPiId: piId },
          })
          return NextResponse.json({
            requires_action: true,
            client_secret:   pi.client_secret,
            payment_intent_id: piId,
          }, { status: 402 })
        } catch (retrieveErr) {
          logger.error('UPSELL', 'Falha ao recuperar PI para 3DS', { piId, error: retrieveErr instanceof Error ? retrieveErr.message : String(retrieveErr) })
        }
      }
    }

    // Só marca declined se for erro de cartão recusado definitivo
    const isCardDeclined =
      stripeErr?.type === 'StripeCardError' ||
      stripeErr?.code === 'card_declined' ||
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
