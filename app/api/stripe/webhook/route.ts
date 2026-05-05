import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { pixelService } from '@/lib/services/pixel.service'
import { productService } from '@/lib/services/product.service'
import { checkoutService } from '@/lib/services/checkout.service'
import { utmifyService } from '@/lib/services/utmify.service'
import { emailService } from '@/lib/services/email.service'
import { webhookNotifyService } from '@/lib/services/webhook-notify.service'
import { stripeLogger } from '@/lib/services/stripe-logger.service'
import { abandonedCartService } from '@/lib/services/abandoned-cart.service'
import { cartService } from '@/lib/services/cart.service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

function resolveMethod(charge: Stripe.Charge | null): string {
  const type = charge?.payment_method_details?.type ?? ''
  const map: Record<string, string> = {
    card: 'Cartão', mb_way: 'MB WAY', multibanco: 'Multibanco',
    sepa_debit: 'SEPA', paypal: 'PayPal', pix: 'Pix', boleto: 'Boleto',
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

async function persistPayment(pi: Stripe.PaymentIntent): Promise<void> {
  const charge      = await getCharge(pi)
  const customer    = charge?.billing_details?.name  ?? pi.metadata?.customerName  ?? 'Cliente'
  const email       = charge?.billing_details?.email ?? pi.metadata?.customerEmail ?? ''
  const productName = pi.metadata?.productName ?? pi.description ?? 'Produto'
  const method      = resolveMethod(charge)
  const isoDate     = new Date().toISOString().slice(0, 10)
  const dateLabel   = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

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
      id: pi.id, customer: pi.metadata?.customerName ?? 'Cliente',
      email: pi.metadata?.customerEmail ?? '', amount: pi.amount,
      status: 'failed', date: isoDate,
      product: pi.metadata?.productName ?? pi.description ?? 'Produto', method: 'Cartão',
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
    await prisma.checkoutPayment.updateMany({
      where: { stripePaymentIntentId: piId },
      data:  { refundedAmount: charge.amount_refunded },
    })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })

  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_2,
  ].filter(Boolean) as string[]

  if (secrets.length === 0) return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 })

  let event: Stripe.Event | undefined
  for (const secret of secrets) {
    try { event = stripe.webhooks.constructEvent(body, sig, secret); break }
    catch { /* try next */ }
  }

  if (!event) return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 })

  // Registar evento no banco antes de processar
  await stripeLogger.logEvent(event)

  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined
  const userAgent = req.headers.get('user-agent') ?? undefined

  try {
    switch (event.type) {

      case 'payment_intent.succeeded': {
        const pi     = event.data.object as Stripe.PaymentIntent
        const charge = await getCharge(pi)

        // Se é um PI de upsell, tratar separadamente
        if (pi.metadata?.upsellFor) {
          const originalPaymentId = pi.metadata.upsellFor
          const upsellProductId   = pi.metadata.productId ?? ''
          const upsellProductName = pi.metadata.productName ?? 'Upsell'

          // Atualizar o CheckoutPayment original com status do upsell
          await prisma.checkoutPayment.update({
            where: { id: originalPaymentId },
            data:  { upsellStatus: 'accepted', upsellAmount: pi.amount, upsellPiId: pi.id },
          })

          // Decrementar estoque do produto de upsell
          if (upsellProductId) {
            await productService.decrementStock(upsellProductId, 1)
          }

          // Registar na tabela Payment para aparecer no painel
          const isoDate   = new Date().toISOString().slice(0, 10)
          const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
          await prisma.payment.upsert({
            where:  { id: pi.id },
            create: {
              id: pi.id, customer: pi.metadata?.customerName ?? 'Cliente',
              email: pi.metadata?.customerEmail ?? '', amount: pi.amount,
              status: 'succeeded', date: isoDate, product: `Upsell: ${upsellProductName}`, method: resolveMethod(charge),
            },
            update: { status: 'succeeded' },
          })
          await prisma.dailySale.upsert({
            where:  { isoDate },
            create: { date: dateLabel, isoDate, receita: pi.amount, vendas: 1, falhas: 0 },
            update: { receita: { increment: pi.amount }, vendas: { increment: 1 } },
          })

          // Disparar pixel Purchase para o upsell
          const originalCp = await prisma.checkoutPayment.findUnique({
            where:  { id: originalPaymentId },
            select: { customerEmail: true, customerPhone: true, urlParams: true },
          })
          const urlParamsUp = (originalCp?.urlParams ?? {}) as Record<string, string>
          await pixelService.trackEvent('Purchase', {
            event: 'Purchase',
            data: {
              value: pi.amount, currency: pi.currency.toUpperCase(), order_id: pi.id,
              content_type: 'product', num_items: 1,
              content_ids: [upsellProductId],
              items: [{ id: upsellProductId, name: upsellProductName, quantity: 1, price: pi.amount }],
            },
            userData: {
              ip, userAgent,
              email: originalCp?.customerEmail || undefined,
              phone: originalCp?.customerPhone || undefined,
              fbp:    urlParamsUp.fbp,
              fbc:    urlParamsUp.fbclid ? `fb.1.${Date.now()}.${urlParamsUp.fbclid}` : undefined,
              ttp:    urlParamsUp.ttp,
              ttclid: urlParamsUp.ttclid,
            },
          })
          break
        }

        await persistPayment(pi)
        await checkoutService.updatePaymentStatus(pi.id, 'paid', resolveMethodRaw(charge))

        // Guardar chargeId e marcar como não abandonado
        const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? ''
        await prisma.checkoutPayment.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data:  { stripeChargeId: chargeId, isAbandoned: false, lastStripeEventId: event.id },
        })
        await abandonedCartService.markRecovered(pi.id)

        // Decrementar estoque do produto (pagamento direto, não carrinho)
        const productId = pi.metadata?.productId
        if (productId) {
          await productService.decrementStock(productId, 1)
        }

        const cpRecord = await prisma.checkoutPayment.findFirst({
          where:  { stripePaymentIntentId: pi.id },
          select: { urlParams: true, customerEmail: true, customerPhone: true },
        })
        const urlParams = (cpRecord?.urlParams ?? {}) as Record<string, string>

        await pixelService.trackEvent('Purchase', {
          event: 'Purchase',
          data: {
            value: pi.amount, currency: pi.currency.toUpperCase(), order_id: pi.id,
            content_type: 'product', num_items: 1,
            content_ids: [pi.metadata?.productSlug ?? pi.metadata?.productId ?? ''],
            items: [{ id: pi.metadata?.productSlug ?? pi.metadata?.productId ?? '', name: pi.metadata?.productName ?? 'Produto', quantity: 1, price: pi.amount }],
          },
          userData: {
            ip, userAgent,
            email:  cpRecord?.customerEmail || pi.metadata?.customerEmail || undefined,
            phone:  cpRecord?.customerPhone || undefined,
            fbp:    urlParams.fbp,
            fbc:    urlParams.fbclid ? `fb.1.${Date.now()}.${urlParams.fbclid}` : undefined,
            ttp:    urlParams.ttp,
            ttclid: urlParams.ttclid,
          },
        })

        const cpFull = await checkoutService.getPaymentByIntentId(pi.id)
        if (cpFull?.product.utmfyApiToken) {
          await utmifyService.sendOrder(cpFull.product.utmfyApiToken, {
            orderId: pi.id, platform: 'other', paymentMethod: resolveMethodRaw(charge),
            status: 'paid', createdAt: new Date(pi.created * 1000).toISOString(),
            approvedDate: new Date().toISOString(),
            customer: { name: cpFull.customerName, email: cpFull.customerEmail, phone: cpFull.customerPhone, document: '' },
            products: [{ id: cpFull.productId, name: cpFull.product.name, priceInCents: pi.amount, quantity: 1 }],
            trackingParameters: {
              utm_source: urlParams.utm_source, utm_medium: urlParams.utm_medium,
              utm_campaign: urlParams.utm_campaign, utm_content: urlParams.utm_content,
              utm_term: urlParams.utm_term, src: urlParams.src, sck: urlParams.sck,
            },
            commission: { totalPriceInCents: pi.amount, gatewayFeeInCents: 0, userCommissionInCents: pi.amount },
          })
        }

        await webhookNotifyService.notifyWebhooks('payment.succeeded', {
          paymentIntentId: pi.id, amount: pi.amount, currency: pi.currency,
          productId: pi.metadata?.productId, customerEmail: pi.metadata?.customerEmail,
        })
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        await persistFailedPayment(pi)
        await checkoutService.updatePaymentStatus(pi.id, 'failed')

        // Guardar detalhes do erro
        const errCode = pi.last_payment_error?.code ?? pi.last_payment_error?.type ?? ''
        const errMsg  = pi.last_payment_error?.message ?? ''
        await prisma.checkoutPayment.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data:  { stripeErrorCode: errCode, stripeErrorMsg: errMsg.slice(0, 500), lastStripeEventId: event.id },
        })

        await webhookNotifyService.notifyWebhooks('payment.failed', {
          paymentIntentId: pi.id, amount: pi.amount, currency: pi.currency,
          productId: pi.metadata?.productId, errorCode: errCode,
        })
        break
      }

      case 'payment_intent.processing': {
        const pi        = event.data.object as Stripe.PaymentIntent
        const isoDate   = new Date().toISOString().slice(0, 10)
        const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        await checkoutService.updatePaymentStatus(pi.id, 'processing')
        await prisma.checkoutPayment.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data:  { lastStripeEventId: event.id },
        })
        await prisma.payment.upsert({
          where:  { id: pi.id },
          create: {
            id: pi.id, customer: pi.metadata?.customerName ?? 'Cliente',
            email: pi.metadata?.customerEmail ?? '', amount: pi.amount,
            status: 'processing', date: isoDate,
            product: pi.metadata?.productName ?? pi.description ?? 'Produto', method: 'Multibanco',
          },
          update: { status: 'processing' },
        })
        await prisma.dailySale.upsert({
          where:  { isoDate },
          create: { date: dateLabel, isoDate, receita: 0, vendas: 0, falhas: 0 },
          update: {},
        })

        try {
          const piExpanded = await stripe.paymentIntents.retrieve(pi.id, { expand: ['latest_charge'] })
          const latestCharge = piExpanded.latest_charge as Stripe.Charge | null
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mbDetails = (latestCharge?.payment_method_details as any)?.multibanco as {
            entity: string; reference: string; expires_at?: number
          } | undefined

          if (mbDetails) {
            const cpRecord = await prisma.checkoutPayment.findFirst({
              where:  { stripePaymentIntentId: pi.id },
              select: { customerName: true, customerEmail: true },
            })
            const toEmail = cpRecord?.customerEmail ?? pi.metadata?.customerEmail ?? ''
            if (toEmail) {
              await emailService.sendMultibancoEmail({
                to: toEmail, name: cpRecord?.customerName ?? pi.metadata?.customerName ?? 'Cliente',
                entity: mbDetails.entity, reference: mbDetails.reference,
                amount: pi.amount, currency: pi.currency.toUpperCase(),
                expiresAt: mbDetails.expires_at ? new Date(mbDetails.expires_at * 1000).toISOString() : '',
              })
            }
          }
        } catch (err) {
          console.error('[webhook] multibanco email error:', err)
        }
        break
      }

      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent
        await checkoutService.updatePaymentStatus(pi.id, 'failed')
        await prisma.payment.updateMany({ where: { id: pi.id }, data: { status: 'failed' } })
        await prisma.checkoutPayment.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data:  { lastStripeEventId: event.id },
        })
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
          await prisma.checkoutPayment.updateMany({
            where: { stripePaymentIntentId: piId },
            data:  { disputeId: dispute.id, disputeStatus: dispute.status, lastStripeEventId: event.id },
          })
        }
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

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.metadata?.type !== 'cart') break

        const cartId = session.metadata.cartId
        if (!cartId) break

        const cart = await cartService.getById(cartId)
        if (!cart || cart.status === 'paid') break

        const isoDate   = new Date().toISOString().slice(0, 10)
        const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        const piId      = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.toString() ?? ''
        const method    = 'Cartão'

        // Criar Order + OrderItems
        const order = await prisma.order.create({
          data: {
            cartId,
            userId:               cart.userId,
            status:               'paid',
            amount:               session.amount_total ?? cart.total,
            currency:             (session.currency ?? cart.currency).toUpperCase(),
            stripeSessionId:      session.id,
            stripePaymentIntentId: piId || null,
            customerName:         session.metadata.customerName  ?? cart.items[0]?.name ?? '',
            customerEmail:        session.customer_details?.email ?? session.metadata.customerEmail ?? '',
            customerPhone:        session.customer_details?.phone ?? session.metadata.customerPhone ?? '',
            paymentMethod:        method,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            urlParams:            (await prisma.cart.findUnique({ where: { id: cartId }, select: { urlParams: true } }))?.urlParams as any ?? {},
            items: {
              create: cart.items.map(i => ({
                productId: i.productId,
                name:      i.name,
                quantity:  i.quantity,
                unitPrice: i.unitPrice,
              })),
            },
          },
        })

        // Decrementar estoque de cada produto
        for (const item of cart.items) {
          await productService.decrementStock(item.productId, item.quantity)
        }

        // Marcar cart como pago
        await cartService.markPaid(cartId, session.id)

        // Registar em Payment (tabela existente) para aparecer na tela de pagamentos
        const productNames = cart.items.map(i => `${i.name} x${i.quantity}`).join(', ')
        const customerEmail = session.customer_details?.email ?? session.metadata.customerEmail ?? ''
        const customerName  = session.metadata.customerName ?? ''

        await prisma.payment.upsert({
          where:  { id: order.id },
          create: {
            id:       order.id,
            customer: customerName,
            email:    customerEmail,
            amount:   session.amount_total ?? cart.total,
            status:   'succeeded',
            date:     isoDate,
            product:  productNames,
            method,
          },
          update: { status: 'succeeded' },
        })

        await prisma.dailySale.upsert({
          where:  { isoDate },
          create: { date: dateLabel, isoDate, receita: session.amount_total ?? cart.total, vendas: 1, falhas: 0 },
          update: { receita: { increment: session.amount_total ?? cart.total }, vendas: { increment: 1 } },
        })

        // Disparar webhooks outbound vinculados ao userId do dono
        await webhookNotifyService.notifyWebhooks('payment.succeeded', {
          orderId:       order.id,
          cartId,
          userId:        cart.userId,
          amount:        session.amount_total ?? cart.total,
          currency:      (session.currency ?? cart.currency).toUpperCase(),
          customerEmail,
          items:         cart.items.map(i => ({ productId: i.productId, name: i.name, quantity: i.quantity })),
        }, cart.userId)

        // Disparar pixels vinculados ao userId do dono
        await pixelService.trackEvent('Purchase', {
          event: 'Purchase',
          data: {
            value:        session.amount_total ?? cart.total,
            currency:     (session.currency ?? cart.currency).toUpperCase(),
            order_id:     order.id,
            content_type: 'product',
            num_items:    cart.items.reduce((s, i) => s + i.quantity, 0),
            content_ids:  cart.items.map(i => i.productId),
            items:        cart.items.map(i => ({ id: i.productId, name: i.name, quantity: i.quantity, price: i.unitPrice })),
          },
          userData: { ip, userAgent, email: customerEmail },
        }, cart.userId)

        break
      }

      default:
        console.log(`Evento não tratado: ${event.type}`)
    }

    await stripeLogger.markEventProcessed(event.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[webhook] processing error for ${event.type}:`, err)
    await stripeLogger.markEventFailed(event.id, msg)
  }

  return NextResponse.json({ received: true })
}
