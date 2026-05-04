import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { pixelService } from '@/lib/services/pixel.service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 })
  }

  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined
  const userAgent = req.headers.get('user-agent') ?? undefined

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      console.log(`✅ Pagamento aprovado: ${pi.id} — R$ ${(pi.amount / 100).toFixed(2)}`)

      await pixelService.trackEvent('Purchase', {
        event: 'Purchase',
        data: {
          value:        pi.amount,
          currency:     pi.currency.toUpperCase(),
          order_id:     pi.id,
          content_type: 'product',
          num_items:    1,
        },
        userData: { ip, userAgent },
      })
      break
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      console.log(`❌ Pagamento falhou: ${pi.id}`)
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      console.log(`🔄 Reembolso processado: ${charge.id}`)
      break
    }

    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription
      console.log(`📦 Assinatura criada: ${sub.id}`)

      await pixelService.trackEvent('Subscribe', {
        event: 'Subscribe',
        data: { currency: 'BRL', content_type: 'product' },
        userData: { ip, userAgent },
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      console.log(`♻️ Assinatura atualizada: ${sub.id}`)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      console.log(`🚫 Assinatura cancelada: ${sub.id}`)
      break
    }

    default:
      console.log(`Evento não tratado: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
