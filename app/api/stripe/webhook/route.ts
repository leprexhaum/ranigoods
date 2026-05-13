import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { pixelService } from '@/lib/services/pixel.service'
import { productService } from '@/lib/services/product.service'
import { checkoutService } from '@/lib/services/checkout.service'
import { utmifyService } from '@/lib/services/utmify.service'
import { pushcutService } from '@/lib/services/pushcut.service'
import { emailService } from '@/lib/services/email.service'
import { webhookNotifyService } from '@/lib/services/webhook-notify.service'
import { stripeLogger } from '@/lib/services/stripe-logger.service'
import { abandonedCartService } from '@/lib/services/abandoned-cart.service'
import { cartService } from '@/lib/services/cart.service'
import { logger } from '@/lib/logger'

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
  if (typeof pi.latest_charge !== 'string') return pi.latest_charge
  try {
    return await stripe.charges.retrieve(pi.latest_charge)
  } catch {
    return null
  }
}

async function persistPayment(pi: Stripe.PaymentIntent): Promise<void> {
  const charge      = await getCharge(pi)
  const method      = resolveMethod(charge)

  // Usar timestamp real do Stripe
  const stripeDate  = new Date(pi.created * 1000)
  const isoDate     = stripeDate.toISOString().slice(0, 10)
  const dateLabel   = stripeDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  // Tentar obter dados reais do CheckoutPayment (preenchidos pelo formulário)
  const cpData = await prisma.checkoutPayment.findFirst({
    where:  { stripePaymentIntentId: pi.id },
    select: { customerName: true, customerEmail: true, product: { select: { name: true } } },
  })

  const customer    = cpData?.customerName || charge?.billing_details?.name || pi.metadata?.customerName || 'Cliente'
  const email       = cpData?.customerEmail || charge?.billing_details?.email || pi.metadata?.customerEmail || ''
  const productName = cpData?.product?.name ?? pi.metadata?.productName ?? pi.description ?? 'Produto'

  await prisma.payment.upsert({
    where:  { id: pi.id },
    create: { id: pi.id, customer, email, amount: pi.amount, status: 'succeeded', date: isoDate, createdAt: stripeDate, product: productName, method },
    update: { status: 'succeeded', method, product: productName },
  })

  await prisma.dailySale.upsert({
    where:  { isoDate },
    create: { date: dateLabel, isoDate, receita: pi.amount, vendas: 1, falhas: 0 },
    update: { receita: { increment: pi.amount }, vendas: { increment: 1 } },
  })

  const stripeProductId = pi.metadata?.stripe_product_id ?? ''
  const internalProductId = pi.metadata?.productId ?? ''
  if (stripeProductId) {
    await productService.incrementSales(stripeProductId, pi.amount)
  } else if (internalProductId) {
    await productService.incrementSalesByInternalId(internalProductId, pi.amount)
  }
}

async function persistFailedPayment(pi: Stripe.PaymentIntent): Promise<void> {
  const stripeDate = new Date(pi.created * 1000)
  const isoDate    = stripeDate.toISOString().slice(0, 10)
  const dateLabel  = stripeDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  await prisma.payment.upsert({
    where:  { id: pi.id },
    create: {
      id: pi.id, customer: pi.metadata?.customerName ?? 'Cliente',
      email: pi.metadata?.customerEmail ?? '', amount: pi.amount,
      status: 'failed', date: isoDate, createdAt: stripeDate,
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
  const start = Date.now()

  let event: Stripe.Event
  try { event = JSON.parse(body) as Stripe.Event }
  catch { return NextResponse.json({ received: true }) }

  logger.info('WEBHOOK', 'Evento recebido', { type: event.type, id: event.id, livemode: event.livemode })

  // Registar evento no banco antes de processar
  await stripeLogger.logEvent(event)

  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0] ?? undefined
  const userAgent = req.headers.get('user-agent') ?? undefined

  try {
    switch (event.type) {

      case 'payment_intent.succeeded': {
        const pi     = event.data.object as Stripe.PaymentIntent
        const charge = await getCharge(pi)
        logger.info('WEBHOOK', 'Processando payment_intent.succeeded', { piId: pi.id, amount: pi.amount, currency: pi.currency.toUpperCase() })

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
            select: { customerEmail: true, customerPhone: true, urlParams: true, product: { select: { userId: true } } },
          })
          const urlParamsUp = (originalCp?.urlParams ?? {}) as Record<string, string>
          const upsellOwnerUserId = originalCp?.product?.userId ?? ''
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
              gclid:  urlParamsUp.gclid,
            },
          }, upsellOwnerUserId)
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

        // Buscar cpRecord com userId para passar ao Pushcut e UTMify
        const cpRecord = await prisma.checkoutPayment.findFirst({
          where:  { stripePaymentIntentId: pi.id },
          select: {
            urlParams: true, customerEmail: true, customerPhone: true,
            customerName: true, productId: true,
            product: { select: { name: true, utmifyConfigId: true, utmifyConfigIds: true, userId: true } },
          },
        })
        const urlParams  = (cpRecord?.urlParams ?? {}) as Record<string, string>
        const ownerUserId = cpRecord?.product?.userId ?? ''

        // Fire-and-forget — status já está gravado, notificações não bloqueiam
        Promise.allSettled([
          pixelService.trackEvent('Purchase', {
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
              gclid:  urlParams.gclid,
            },
          }, ownerUserId),

          // UTMify via configs vinculadas ao produto (suporta múltiplas)
          (async () => {
            if (!cpRecord?.product) return
            const configIds = (cpRecord.product.utmifyConfigIds as string[] ?? []).length > 0
              ? (cpRecord.product.utmifyConfigIds as string[])
              : cpRecord.product.utmifyConfigId ? [cpRecord.product.utmifyConfigId] : []
            for (const cfgId of configIds) {
              const utmCfg = await prisma.utmifyConfig.findUnique({ where: { id: cfgId } })
              if (utmCfg?.enabled && utmCfg.apiToken) {
                await utmifyService.sendOrder(utmCfg.apiToken, {
                  orderId:      pi.id,
                  stripeMethod: resolveMethodRaw(charge),
                  currency:     pi.currency,
                  createdAt:    new Date(pi.created * 1000),
                  approvedAt:   new Date(),
                  customer: {
                    name:     cpRecord.customerName,
                    email:    cpRecord.customerEmail,
                    phone:    cpRecord.customerPhone,
                    document: '',
                    ip:       ip ?? undefined,
                  },
                  products: [{
                    id:           cpRecord.productId,
                    name:         cpRecord.product.name,
                    quantity:     1,
                    priceInCents: pi.amount,
                  }],
                  trackingParameters: {
                    src:          urlParams.src,
                    sck:          urlParams.sck,
                    utm_source:   urlParams.utm_source,
                    utm_campaign: urlParams.utm_campaign,
                    utm_medium:   urlParams.utm_medium,
                    utm_content:  urlParams.utm_content,
                    utm_term:     urlParams.utm_term,
                  },
                  totalPriceInCents: pi.amount,
                  gatewayFeeInCents: 0,
                })
              }
            }
          })(),

          // Pushcut com userId do dono do produto para filtrar configs correctamente
          pushcutService.notify('payment.succeeded', {
            title:   `💰 Venda aprovada — ${cpRecord?.product?.name ?? pi.metadata?.productName ?? 'Produto'}`,
            message: `${cpRecord?.customerName || pi.metadata?.customerName || 'Cliente'} — ${(pi.amount / 100).toFixed(2)} ${pi.currency.toUpperCase()}`,
            userId:  ownerUserId,
          }),

          webhookNotifyService.notifyWebhooks('payment.succeeded', {
            paymentIntentId: pi.id, amount: pi.amount, currency: pi.currency,
            productId: pi.metadata?.productId, customerEmail: pi.metadata?.customerEmail,
          }, ownerUserId),
        ]).catch(() => {/* silencioso */})
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const errCode = pi.last_payment_error?.code ?? pi.last_payment_error?.type ?? ''
        const errMsg  = pi.last_payment_error?.message ?? ''
        logger.warn('WEBHOOK', 'Pagamento falhado', { piId: pi.id, reason: errCode, code: errMsg.slice(0, 100), amount: pi.amount })
        await persistFailedPayment(pi)
        await checkoutService.updatePaymentStatus(pi.id, 'failed')

        // Guardar detalhes do erro
        await prisma.checkoutPayment.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data:  { stripeErrorCode: errCode, stripeErrorMsg: errMsg.slice(0, 500), lastStripeEventId: event.id },
        })

        // Buscar dados do CheckoutPayment para notificação
        const cpFailed = await prisma.checkoutPayment.findFirst({
          where: { stripePaymentIntentId: pi.id },
          select: { customerName: true, product: { select: { name: true, userId: true } } },
        })

        await pushcutService.notify('payment.failed', {
          title:   `❌ Pagamento falhado — ${cpFailed?.product?.name ?? pi.metadata?.productName ?? 'Produto'}`,
          message: `${cpFailed?.customerName || pi.metadata?.customerName || 'Cliente'} — ${(pi.amount / 100).toFixed(2)} ${pi.currency.toUpperCase()}`,
          userId:  cpFailed?.product?.userId,
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
          const latestCharge = piExpanded.latest_charge as Stripe.Charge | null          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          logger.error('WEBHOOK', 'Erro ao enviar email Multibanco', { piId: pi.id, error: err instanceof Error ? err.message : String(err) })
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

      case 'charge.dispute.created':
      case 'charge.dispute.updated':
      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute
        logger.warn('WEBHOOK', 'Disputa recebida', { disputeId: dispute.id, type: event.type, amount: dispute.amount, reason: dispute.reason })
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
        logger.info('WEBHOOK', 'Assinatura criada', { subscriptionId: sub.id })
        const subProductId = sub.metadata?.productId ?? ''
        let subOwnerUserId = ''
        if (subProductId) {
          const subProduct = await prisma.product.findUnique({ where: { id: subProductId }, select: { userId: true } })
          subOwnerUserId = subProduct?.userId ?? ''
        }
        await pixelService.trackEvent('Subscribe', {
          event: 'Subscribe',
          data: { currency: 'EUR', content_type: 'product' },
          userData: { ip, userAgent },
        }, subOwnerUserId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        logger.info('WEBHOOK', 'Assinatura atualizada', { subscriptionId: sub.id })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        logger.info('WEBHOOK', 'Assinatura cancelada', { subscriptionId: sub.id })
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

      case 'charge.pending': {
        const charge  = event.data.object as Stripe.Charge
        const piId    = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id ?? ''
        const isoDate   = new Date(charge.created * 1000).toISOString().slice(0, 10)
        const dateLabel = new Date(charge.created * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        const methodType = charge.payment_method_details?.type ?? ''
        const methodMap: Record<string, string> = { card: 'Cartão', mb_way: 'MB WAY', multibanco: 'Multibanco', sepa_debit: 'SEPA', paypal: 'PayPal', pix: 'Pix', boleto: 'Boleto' }
        const method = methodMap[methodType] ?? 'Cartão'

        // Salvar na tabela Payment como pending
        const paymentId = piId || charge.id
        await prisma.payment.upsert({
          where:  { id: paymentId },
          create: {
            id:       paymentId,
            customer: charge.billing_details?.name ?? charge.metadata?.customerName ?? 'Cliente',
            email:    charge.billing_details?.email ?? charge.metadata?.customerEmail ?? '',
            amount:   charge.amount,
            status:   'pending',
            date:     isoDate,
            product:  charge.metadata?.productName ?? charge.description ?? 'Produto',
            method,
          },
          update: { status: 'pending' },
        }).catch(() => {})

        // Salvar balance transaction se disponível
        if (charge.balance_transaction && typeof charge.balance_transaction !== 'string') {
          const bt = charge.balance_transaction as Stripe.BalanceTransaction
          await prisma.stripeBalanceTransaction.upsert({
            where:  { id: bt.id },
            create: { id: bt.id, type: bt.type, amount: bt.amount, fee: bt.fee, net: bt.net, currency: bt.currency.toUpperCase(), status: bt.status, description: bt.description ?? '', createdAt: new Date(bt.created * 1000) },
            update: { status: bt.status },
          }).catch(() => {})
        }

        if (piId) {
          await prisma.checkoutPayment.updateMany({
            where: { stripePaymentIntentId: piId },
            data:  { lastStripeEventId: event.id },
          }).catch(() => {})
        }
        break
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge
        const piId   = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (!piId) break

        const card    = charge.payment_method_details?.card
        const outcome = charge.outcome
        const last4   = card?.last4 ?? ''
        const brand   = card?.brand ?? ''
        const country = card?.country ?? ''
        const risk    = outcome?.risk_level ?? ''

        let fee = 0; let net = 0; let balanceTxId = ''
        if (charge.balance_transaction && typeof charge.balance_transaction === 'string') {
          try {
            const bt = await stripe.balanceTransactions.retrieve(charge.balance_transaction)
            fee = bt.fee; net = bt.net; balanceTxId = bt.id
          } catch { /* charge de outra conta — ignorar */ }
        } else if (charge.balance_transaction && typeof charge.balance_transaction !== 'string') {
          const bt = charge.balance_transaction as Stripe.BalanceTransaction
          fee = bt.fee; net = bt.net; balanceTxId = bt.id
        }

        await prisma.payment.updateMany({
          where: { id: piId },
          data:  { cardLast4: last4, cardBrand: brand, cardCountry: country, riskLevel: risk, fee, net, balanceTxId },
        })
        await prisma.checkoutPayment.updateMany({
          where: { stripePaymentIntentId: piId },
          data:  { cardLast4: last4, cardBrand: brand, cardCountry: country, riskLevel: risk, fee, net, balanceTxId },
        })
        break
      }

      case 'radar.early_fraud_warning.created': {
        const efw    = event.data.object as Stripe.Radar.EarlyFraudWarning
        const piId   = typeof efw.payment_intent === 'string' ? efw.payment_intent : efw.payment_intent?.id ?? ''
        const chargeId = typeof efw.charge === 'string' ? efw.charge : efw.charge?.id ?? ''
        await prisma.fraudWarning.create({
          data: {
            id:              efw.id,
            paymentIntentId: piId,
            chargeId,
            fraudType:       efw.fraud_type,
            actionable:      efw.actionable,
          },
        }).catch(() => { /* ignorar duplicados */ })
        if (piId) {
          await prisma.payment.updateMany({ where: { id: piId }, data: { riskLevel: 'highest' } })
          await prisma.checkoutPayment.updateMany({ where: { stripePaymentIntentId: piId }, data: { riskLevel: 'highest' } })
        }
        break
      }

      case 'payout.created':
      case 'payout.paid':
      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout
        await prisma.payout.upsert({
          where:  { id: payout.id },
          create: {
            id:          payout.id,
            amount:      payout.amount,
            currency:    payout.currency.toUpperCase(),
            status:      payout.status,
            arrivalDate: new Date(payout.arrival_date * 1000),
            description: payout.description ?? '',
          },
          update: { status: payout.status },
        })
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice   = event.data.object as Stripe.Invoice
        const subId     = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? ''
        const custId    = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? ''
        const isoDate   = new Date().toISOString().slice(0, 10)
        const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        if (invoice.amount_paid > 0) {
          await prisma.payment.upsert({
            where:  { id: invoice.id },
            create: {
              id:       invoice.id,
              customer: invoice.customer_name ?? custId,
              email:    invoice.customer_email ?? '',
              amount:   invoice.amount_paid,
              status:   'succeeded',
              date:     isoDate,
              product:  `Assinatura ${subId}`,
              method:   'Cartão',
            },
            update: { status: 'succeeded' },
          })
          await prisma.dailySale.upsert({
            where:  { isoDate },
            create: { date: dateLabel, isoDate, receita: invoice.amount_paid, vendas: 1, falhas: 0 },
            update: { receita: { increment: invoice.amount_paid }, vendas: { increment: 1 } },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice   = event.data.object as Stripe.Invoice
        const isoDate   = new Date().toISOString().slice(0, 10)
        const dateLabel = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        await prisma.dailySale.upsert({
          where:  { isoDate },
          create: { date: dateLabel, isoDate, receita: 0, vendas: 0, falhas: 1 },
          update: { falhas: { increment: 1 } },
        })
        logger.warn('WEBHOOK', 'Invoice payment failed', { invoiceId: invoice.id })
        break
      }

      case 'charge.dispute.funds_withdrawn':
      case 'charge.dispute.funds_reinstated': {
        const dispute   = event.data.object as Stripe.Dispute
        const piId      = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id ?? ''
        const newStatus = event.type === 'charge.dispute.funds_withdrawn' ? 'disputed' : 'dispute_won'
        if (piId) {
          await prisma.checkoutPayment.updateMany({
            where: { stripePaymentIntentId: piId },
            data:  { disputeStatus: newStatus },
          })
        }
        await prisma.stripeDispute.upsert({
          where:  { id: dispute.id },
          create: {
            id:              dispute.id,
            chargeId:        typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? '',
            paymentIntentId: piId,
            amount:          dispute.amount,
            currency:        dispute.currency.toUpperCase(),
            status:          dispute.status,
            reason:          dispute.reason,
            evidenceDueBy:   dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000) : null,
          },
          update: { status: dispute.status },
        }).catch(() => {})
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const piId   = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id ?? ''
        logger.info('WEBHOOK', 'Reembolso processado', { chargeId: charge.id, piId, amount_refunded: charge.amount_refunded })
        for (const r of charge.refunds?.data ?? []) {
          await prisma.stripeRefund.upsert({
            where:  { id: r.id },
            create: {
              id:              r.id,
              chargeId:        charge.id,
              paymentIntentId: piId,
              amount:          r.amount,
              currency:        r.currency.toUpperCase(),
              status:          r.status ?? '',
              reason:          r.reason ?? '',
            },
            update: { status: r.status ?? '' },
          }).catch(() => {})
        }
        await persistRefund(charge)

        // Buscar dados do CheckoutPayment para notificação
        const piIdRefund = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        const cpRefund = piIdRefund ? await prisma.checkoutPayment.findFirst({
          where: { stripePaymentIntentId: piIdRefund },
          select: { customerName: true, product: { select: { name: true, userId: true } } },
        }) : null

        await pushcutService.notify('payment.refunded', {
          title:   `🔄 Reembolso — ${cpRefund?.product?.name ?? 'Produto'}`,
          message: `${cpRefund?.customerName || 'Cliente'} — ${(charge.amount_refunded / 100).toFixed(2)} ${charge.currency.toUpperCase()}`,
          userId:  cpRefund?.product?.userId,
        })
        await webhookNotifyService.notifyWebhooks('payment.refunded', {
          chargeId: charge.id, amount: charge.amount_refunded, currency: charge.currency,
        })
        break
      }

      case 'payment_method.attached': {
        const pm   = event.data.object as Stripe.PaymentMethod
        const cust = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id ?? ''
        if (cust) {
          await prisma.stripeCustomer.updateMany({
            where: { stripeCustomerId: cust },
            data:  { updatedAt: new Date() },
          })
        }
        break
      }

      case 'customer.updated': {
        const cust = event.data.object as Stripe.Customer
        await prisma.stripeCustomer.updateMany({
          where: { stripeCustomerId: cust.id },
          data:  {
            name:  cust.name  ?? '',
            email: cust.email ?? '',
            phone: cust.phone ?? '',
          },
        })
        break
      }

      case 'customer.deleted': {
        const cust = event.data.object as Stripe.Customer
        await prisma.stripeCustomer.deleteMany({ where: { stripeCustomerId: cust.id } })
        break
      }

      case 'balance.available': {
        const bal = event.data.object as Stripe.Balance
        const available = bal.available.reduce((s, b) => s + b.amount, 0)
        const pending   = bal.pending.reduce((s, b) => s + b.amount, 0)
        const currency  = bal.available[0]?.currency?.toUpperCase() ?? 'EUR'
        await prisma.stripeBalance.upsert({
          where:  { id: 1 },
          create: { id: 1, available, pending, currency },
          update: { available, pending, currency },
        })
        break
      }

      case 'payout.reconciliation_completed': {
        const payout = event.data.object as Stripe.Payout
        await prisma.payout.upsert({
          where:  { id: payout.id },
          create: {
            id:          payout.id,
            amount:      payout.amount,
            currency:    payout.currency.toUpperCase(),
            status:      'reconciled',
            arrivalDate: new Date(payout.arrival_date * 1000),
            description: payout.description ?? '',
          },
          update: { status: 'reconciled' },
        })
        break
      }

      case 'payment_intent.requires_action': {
        const pi    = event.data.object as Stripe.PaymentIntent
        const email = pi.metadata?.customerEmail ?? ''
        await prisma.checkoutPayment.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data:  { status: 'requires_action' },
        })
        logger.info('WEBHOOK', 'PaymentIntent requires_action', { piId: pi.id, email })
        break
      }

      case 'coupon.created':
      case 'coupon.updated': {
        const c = event.data.object as Stripe.Coupon
        await prisma.stripeCoupon.upsert({
          where:  { id: c.id },
          create: {
            id:             c.id,
            name:           c.name ?? c.id,
            amountOff:      c.amount_off ?? null,
            percentOff:     c.percent_off ?? null,
            currency:       c.currency?.toUpperCase() ?? '',
            duration:       c.duration,
            durationMonths: c.duration_in_months ?? null,
            maxRedemptions: c.max_redemptions ?? null,
            timesRedeemed:  c.times_redeemed,
            valid:          c.valid,
          },
          update: { timesRedeemed: c.times_redeemed, valid: c.valid, name: c.name ?? c.id },
        }).catch(() => {})
        break
      }

      case 'coupon.deleted': {
        const c = event.data.object as Stripe.Coupon
        await prisma.stripeCoupon.updateMany({ where: { id: c.id }, data: { valid: false } }).catch(() => {})
        break
      }

      case 'promotion_code.created':
      case 'promotion_code.updated': {
        const p = event.data.object as Stripe.PromotionCode
        await prisma.stripePromoCode.upsert({
          where:  { id: p.id },
          create: {
            id:             p.id,
            couponId:       typeof p.coupon === 'string' ? p.coupon : p.coupon.id,
            code:           p.code,
            active:         p.active,
            timesRedeemed:  p.times_redeemed,
            maxRedemptions: p.max_redemptions ?? null,
            expiresAt:      p.expires_at ? new Date(p.expires_at * 1000) : null,
          },
          update: { active: p.active, timesRedeemed: p.times_redeemed },
        }).catch(() => {})
        break
      }

      case 'charge.updated': {
        const charge = event.data.object as Stripe.Charge
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id
        if (piId) {
          const method = resolveMethod(charge)
          await prisma.payment.updateMany({
            where: { id: piId },
            data:  { method },
          })
        }
        break
      }

      case 'payment_intent.created': {
        const pi = event.data.object as Stripe.PaymentIntent
        // Garantir que o CheckoutPayment existe — se foi criado via API/dashboard Stripe
        // e não pelo nosso checkout, criar um registro pendente
        const existing = await prisma.checkoutPayment.findFirst({
          where: { stripePaymentIntentId: pi.id },
        })
        if (!existing && pi.metadata?.productId) {
          await prisma.checkoutPayment.create({
            data: {
              productId: pi.metadata.productId,
              status: 'pending',
              amount: pi.amount,
              currency: pi.currency.toUpperCase(),
              stripePaymentIntentId: pi.id,
              customerName: pi.metadata?.customerName ?? '',
              customerEmail: pi.metadata?.customerEmail ?? '',
            },
          }).catch(() => {}) // Ignorar se já existe (race condition)
        }
        logger.info('WEBHOOK', 'PaymentIntent criado', { piId: pi.id, amount: pi.amount, currency: pi.currency })
        break
      }

      default:
        logger.info('WEBHOOK', 'Evento não tratado', { type: event.type, id: event.id })
    }

    await stripeLogger.markEventProcessed(event.id)
    logger.info('WEBHOOK', 'Evento processado', { type: event.type, id: event.id, duracao: `${Date.now() - start}ms` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('WEBHOOK', 'Erro no processamento', { type: event.type, id: event.id, error: msg, duracao: `${Date.now() - start}ms` })
    await stripeLogger.markEventFailed(event.id, msg)
  }

  return NextResponse.json({ received: true })
}
