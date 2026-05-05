import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { pixelService } from '@/lib/services/pixel.service'
import { productService } from '@/lib/services/product.service'
import { checkoutService } from '@/lib/services/checkout.service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveMethod(charge: Stripe.Charge | null): string {
  const type = charge?.payment_method_details?.type ?? ''
  const map: Record<string, string> = {
    card:       'Cartão',
    mb_way:     'MB WAY',
    multibanco: 'Multibanco',
    sepa_debit: 'SEPA',
    paypal:     'PayPal',
    pix:        'Pix',
    boleto:     'Boleto',
  }
  return map[type] ?? 'Cartão'
}

function resolveMethodRaw(charge: Stripe.Charge | null): string {
  return charge?.payment_method_details?.type ?? 'card'
}

async function getCharge(pi: Stripe.PaymentIntent): Promise<Stripe.Charge | null> {
  if (!pi.latest_charge) return null
  return typeof pi.latest_charge === 'string'
    ? await stripe.charges.retrieve(pi.latest_charge)
    : pi.latest_charge
}

// ─── Persist helpers ──────────────────────────────────────────────────────────

async function persistPayment(pi: Stripe.PaymentIntent): Promise<void> {
  const charge    = await getCharge(pi)
  const customer  = charge?.billing_details?.name  ?? pi.metadata?.customerName  ?? 'Cliente'
  const email     = charge?.billing_details?.email ?? pi.metadata?.customerEmail ?? ''
  const productName = pi.metadata?.productName ?? pi.description ?? 'Produto'
  const method    = resolveMethod(charge)
  const isoDate   = new Date().toISOString().slice(0, 10)
  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  await prisma.payment.upsert({
    where:  { id: pi.id },
    create: { id: pi.id, customer, email, amount: pi.amount, status: 'succeeded', date: isoDate, product: productName, method },
    update: { status: 'succeeded', method },
  })

  await prisma.dailySale.upsert({
    where:  { isoDate },
    create: { date: dateLabel, isoDate, receita: pi.amount, vendas: 1, falhas: 0 },
    update: { receita: { increment: pi.amount }, vendas: { increment: 1 } },
  })

  // Incrementar vendas no produto se tiver stripeId
  const stripeProductId = pi.metadata?.stripe_product_id ?? ''
  if (stripeProductId) {
    await productService.incrementSales(stripeProductId, pi.amount)
  }
}

async function persistFailedPayment(pi: Stripe.PaymentIntent): Promise<void> {
  const isoDate   = new Date().toISOString().slice(0, 10)
  const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  await prisma.payment.upsert({
    where:  { id: pi.id },
    create: {
      id:       pi.id,
      customer: pi.metadata?.customerName  ?? 'Cliente',
      email:    pi.metadata?.customerEmail ?? '',
      amount:   pi.amount,
      status:   'failed',
      date:     isoDate,
      product:  pi.metadata?.productName ?? pi.description ?? 'Produto',
      method:   'Cartão',
    },
    update: { status: 'failed' },
  })

  await prisma.dailySale.upsert({
    where:  { isoDate },
    create: { date: dateLabel, isoDate, receita: 0, vendas: 0, falhas: 1 },
    update: { falhas: { increment: 1 } },
  })
}

async function persistRefund(charge: Stripe.Charge): Promise<void> {
  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id
  if (piId) {
    await prisma.payment.updateMany({ where: { id: piId }, data: { status: 'refunded' } })
  }
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

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
    try { event = stripe.webhooks.constructEvent(body, sig, secret); break }
    catch { /* try next */ }
  }

  if (!event) {
    return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 })
  }

  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined
  const userAgent = req.headers.get('user-agent') ?? undefined

  switch (event.type) {

    case 'payment_intent.succeeded': {
      const pi     = event.data.object as Stripe.PaymentIntent
      const charge = await getCharge(pi)
      await persistPayment(pi)
      await checkoutService.updatePaymentStatus(pi.id, 'paid', resolveMethodRaw(charge))
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
      await checkoutService.updatePaymentStatus(pi.id, 'failed')
      break
    }

    case 'payment_intent.processing': {
      const pi      = event.data.object as Stripe.PaymentIntent
      const isoDate = new Date().toISOString().slice(0, 10)
      const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      await checkoutService.updatePaymentStatus(pi.id, 'processing')
      await prisma.payment.upsert({
        where:  { id: pi.id },
        create: {
          id:       pi.id,
          customer: pi.metadata?.customerName  ?? 'Cliente',
          email:    pi.metadata?.customerEmail ?? '',
          amount:   pi.amount,
          status:   'processing',
          date:     isoDate,
          product:  pi.metadata?.productName ?? pi.description ?? 'Produto',
          method:   'Multibanco',
        },
        update: { status: 'processing' },
      })
      await prisma.dailySale.upsert({
        where:  { isoDate },
        create: { date: dateLabel, isoDate, receita: 0, vendas: 0, falhas: 0 },
        update: {},
      })
      break
    }

    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent
      await checkoutService.updatePaymentStatus(pi.id, 'failed')
      await prisma.payment.updateMany({ where: { id: pi.id }, data: { status: 'failed' } })
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      await persistRefund(charge)
      break
    }

    case 'charge.dispute.created':
    case 'charge.dispute.updated':
    case 'charge.dispute.closed': {
      const dispute = event.data.object as Stripe.Dispute
      const piId = typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : dispute.payment_intent?.id
      if (piId) {
        const newStatus = event.type === 'charge.dispute.closed' ? 'refunded' : 'disputed'
        await prisma.payment.updateMany({ where: { id: piId }, data: { status: newStatus } })
        await checkoutService.updatePaymentStatus(piId, 'failed')
      }
      console.log(`[webhook] dispute ${event.type}: ${dispute.id} reason=${dispute.reason} status=${dispute.status}`)
      break
    }

    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription
      console.log(`Assinatura criada: ${sub.id}`)
      await pixelService.trackEvent('Subscribe', {
        event: 'Subscribe',
        data: { currency: 'EUR', content_type: 'product' },
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
