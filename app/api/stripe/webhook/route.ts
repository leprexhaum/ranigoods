import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { pixelService } from '@/lib/services/pixel.service'
import { productService } from '@/lib/services/product.service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

async function persistPayment(pi: Stripe.PaymentIntent): Promise<void> {
  const charge = pi.latest_charge
    ? (typeof pi.latest_charge === 'string'
        ? await stripe.charges.retrieve(pi.latest_charge)
        : pi.latest_charge)
    : null

  const customer = charge?.billing_details?.name
    ?? pi.metadata?.customer_name
    ?? 'Cliente'
  const email = charge?.billing_details?.email
    ?? pi.metadata?.customer_email
    ?? ''
  const product = pi.metadata?.product_name ?? pi.description ?? 'Produto'
  const stripeProductId = pi.metadata?.stripe_product_id ?? ''

  const method: 'Cartão' | 'Pix' | 'Boleto' = (() => {
    const pm = charge?.payment_method_details?.type ?? ''
    if (pm === 'pix')   return 'Pix'
    if (pm === 'boleto') return 'Boleto'
    return 'Cartão'
  })()

  const isoDate = new Date().toISOString().slice(0, 10)
  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  await prisma.payment.upsert({
    where: { id: pi.id },
    create: {
      id:       pi.id,
      customer,
      email,
      amount:   pi.amount,
      status:   'succeeded',
      date:     isoDate,
      product,
      method,
    },
    update: { status: 'succeeded' },
  })

  await prisma.dailySale.upsert({
    where: { isoDate },
    create: { date: dateLabel, isoDate, receita: pi.amount, vendas: 1, falhas: 0 },
    update: { receita: { increment: pi.amount }, vendas: { increment: 1 } },
  })

  if (stripeProductId) {
    await productService.incrementSales(stripeProductId, pi.amount)
  }
}

async function persistFailedPayment(pi: Stripe.PaymentIntent): Promise<void> {
  const isoDate = new Date().toISOString().slice(0, 10)
  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  await prisma.payment.upsert({
    where: { id: pi.id },
    create: {
      id:       pi.id,
      customer: pi.metadata?.customer_name ?? 'Cliente',
      email:    pi.metadata?.customer_email ?? '',
      amount:   pi.amount,
      status:   'failed',
      date:     isoDate,
      product:  pi.metadata?.product_name ?? pi.description ?? 'Produto',
      method:   'Cartão',
    },
    update: { status: 'failed' },
  })

  await prisma.dailySale.upsert({
    where: { isoDate },
    create: { date: dateLabel, isoDate, receita: 0, vendas: 0, falhas: 1 },
    update: { falhas: { increment: 1 } },
  })
}

async function persistRefund(charge: Stripe.Charge): Promise<void> {
  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id

  if (piId) {
    await prisma.payment.updateMany({
      where: { id: piId },
      data:  { status: 'refunded' },
    })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_2,
  ].filter(Boolean) as string[]

  if (secrets.length === 0) {
    return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 })
  }

  let event: Stripe.Event | undefined

  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret)
      break
    } catch {
      // try next secret
    }
  }

  if (!event) {
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 })
  }

  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined
  const userAgent = req.headers.get('user-agent') ?? undefined

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await persistPayment(pi)
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
      await persistFailedPayment(pi)
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      await persistRefund(charge)
      break
    }

    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription
      console.log(`Assinatura criada: ${sub.id}`)
      await pixelService.trackEvent('Subscribe', {
        event: 'Subscribe',
        data: { currency: 'BRL', content_type: 'product' },
        userData: { ip, userAgent },
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      console.log(`Assinatura atualizada: ${sub.id}`)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      console.log(`Assinatura cancelada: ${sub.id}`)
      break
    }

    default:
      console.log(`Evento não tratado: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
