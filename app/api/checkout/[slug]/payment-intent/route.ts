import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { checkoutService } from '@/lib/services/checkout.service'
import { productService } from '@/lib/services/product.service'
import { stripeLogger } from '@/lib/services/stripe-logger.service'
import { abandonedCartService } from '@/lib/services/abandoned-cart.service'
import { logger } from '@/lib/logger'
import type { CreatePaymentIntentRequest } from '@/lib/types/checkout'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export const dynamic = 'force-dynamic'

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT   = 10
const WINDOW_MS    = 60_000

function isRateLimited(ip: string): boolean {
  const now  = Date.now()
  const hits = (rateLimitMap.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  hits.push(now)
  rateLimitMap.set(ip, hits)
  return hits.length > RATE_LIMIT
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    logger.warn('CHECKOUT', 'Rate limit atingido', { ip, tentativas: RATE_LIMIT + 1, janela: '60s' })
    return NextResponse.json({ error: 'Demasiadas tentativas. Aguarde um momento.' }, { status: 429 })
  }

  try {
    const body = await req.json() as CreatePaymentIntentRequest & {
      bumpIds?:    string[]
      shippingId?: string
      urlParams?:  Record<string, string>
    }

    const product = await checkoutService.getProductBySlug(params.slug)
    if (!product) {
      logger.warn('CHECKOUT', 'Produto não encontrado', { slug: params.slug })
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Verificar estoque antes de criar o PI
    const stockCheck = await productService.checkStock(product.id, 1)
    if (!stockCheck.available) {
      logger.warn('CHECKOUT', 'Produto esgotado', { productId: product.id, stock: 0 })
      return NextResponse.json({ error: 'Produto esgotado. Não há unidades disponíveis.' }, { status: 409 })
    }
    logger.info('CHECKOUT', 'Verificação de estoque', { productId: product.id, disponivel: true, restante: stockCheck.stock })

    let total = product.price

    if (body.bumpIds?.length) {
      for (const bumpId of body.bumpIds) {
        const bump = product.orderBumps.find(b => b.id === bumpId)
        if (bump) total += bump.price
      }
    }

    if (body.shippingId) {
      const shipping = product.shippingOptions.find(s => s.id === body.shippingId)
      if (shipping) total += shipping.price
    }

    const stripeMethodMap: Record<string, string> = {
      card: 'card', mbway: 'mb_way', multibanco: 'multibanco',
      apple_pay: 'card', google_pay: 'card', sepa: 'sepa_debit',
    }

    const paymentMethodTypes = product.paymentMethods.length > 0
      ? [...new Set(product.paymentMethods.map(m => stripeMethodMap[m] ?? 'card'))]
      : ['card']

    const customerName  = body.customerName?.trim()  || ''
    const customerEmail = body.customerEmail?.trim() || ''
    const urlParams     = body.urlParams ?? {}

    // Criar ou recuperar Customer na Stripe para habilitar upsell robusto
    let stripeCustomerId: string | undefined
    try {
      const existing = await stripe.customers.list({ email: customerEmail, limit: 1 })
      if (existing.data.length > 0) {
        stripeCustomerId = existing.data[0].id
      } else if (customerEmail) {
        const customer = await stripe.customers.create({
          name:  customerName,
          email: customerEmail,
          phone: body.customerPhone ?? undefined,
          metadata: { productId: product.id, productSlug: product.slug ?? '' },
        })
        stripeCustomerId = customer.id
      }
    } catch { /* não bloquear o checkout se falhar */ }

    const upMeta: Record<string, string> = {}
    for (const [k, v] of Object.entries(urlParams)) {
      upMeta[`up_${k}`] = String(v).slice(0, 500)
    }

    const piParams = {
      amount:               total,
      currency:             product.currency.toLowerCase(),
      payment_method_types: paymentMethodTypes,
      customer:             stripeCustomerId,
      metadata: {
        productId: product.id, productSlug: product.slug, productName: product.name,
        customerName, customerEmail, ...upMeta,
      },
    }

    // Criar PI com logging — fallback removendo métodos não suportados
    let pi
    try {
      pi = await stripeLogger.logApiCall(
        'createPaymentIntent',
        '',
        piParams,
        () => stripe.paymentIntents.create(piParams),
      )
    } catch (stripeErr: unknown) {
      const isInvalidMethod = stripeErr instanceof Error && stripeErr.message?.includes('payment method type')
      if (isInvalidMethod && paymentMethodTypes.length > 1) {
        // Extrair o método inválido da mensagem de erro e remover
        const match = (stripeErr as Error).message.match(/type "([^"]+)" is invalid/)
        const invalidMethod = match?.[1]
        const filteredMethods = invalidMethod
          ? paymentMethodTypes.filter(m => m !== invalidMethod)
          : paymentMethodTypes.filter(m => m === 'card')
        const fallbackParams = { ...piParams, payment_method_types: filteredMethods.length > 0 ? filteredMethods : ['card'] }
        pi = await stripeLogger.logApiCall(
          'createPaymentIntent',
          '',
          fallbackParams,
          () => stripe.paymentIntents.create(fallbackParams),
        )
      } else {
        throw stripeErr
      }
    }

    const payment = await checkoutService.createPayment({
      productId:             product.id,
      amount:                total,
      currency:              product.currency,
      stripePaymentIntentId: pi.id,
      customerName,
      customerEmail,
      customerPhone:         body.customerPhone ?? '',
      stripeCustomerId:      stripeCustomerId ?? '',
      urlParams,
      address:               body.address,
      metadata: {
        bumpIds:    body.bumpIds    ?? [],
        shippingId: body.shippingId ?? null,
      },
    })

    // Criar registo de carrinho abandonado apenas se houver dados do cliente
    if (customerEmail || customerName) {
      await abandonedCartService.create({
        productId:             product.id,
        stripePaymentIntentId: pi.id,
        customerName,
        customerEmail,
        customerPhone:         body.customerPhone ?? '',
        amount:                total,
        currency:              product.currency,
        urlParams,
        bumpIds:               body.bumpIds    ?? [],
        shippingId:            body.shippingId ?? '',
      })
    }

    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!

    logger.info('CHECKOUT', 'PaymentIntent criado', { piId: pi.id, productId: product.id, amount: total, currency: product.currency, email: customerEmail, ip })

    return NextResponse.json({
      clientSecret:    pi.client_secret,
      paymentIntentId: pi.id,
      publishableKey,
      paymentId:       payment.id,
      amount:          total,
      currency:        product.currency,
    })
  } catch (err) {
    logger.error('CHECKOUT', 'Erro ao criar PaymentIntent', { slug: params.slug, error: err instanceof Error ? err.message : String(err), ip })
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
