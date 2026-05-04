import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { checkoutService } from '@/lib/services/checkout.service'
import type { CreatePaymentIntentRequest } from '@/lib/types/checkout'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const body = await req.json() as CreatePaymentIntentRequest & { bumpIds?: string[]; shippingId?: string }

    const product = await checkoutService.getProductBySlug(params.slug)
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    if (!body.customerName?.trim() || !body.customerEmail?.trim()) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
    }

    // Calcular total
    let total = product.price

    // Adicionar order bumps selecionados
    if (body.bumpIds?.length) {
      for (const bumpId of body.bumpIds) {
        const bump = product.orderBumps.find(b => b.id === bumpId)
        if (bump) total += bump.price
      }
    }

    // Adicionar shipping selecionado
    if (body.shippingId) {
      const shipping = product.shippingOptions.find(s => s.id === body.shippingId)
      if (shipping) total += shipping.price
    }

    // Mapear métodos de pagamento para Stripe
    const stripeMethodMap: Record<string, string> = {
      card:        'card',
      mbway:       'mb_way',
      multibanco:  'multibanco',
      apple_pay:   'card',
      google_pay:  'card',
      sepa:        'sepa_debit',
    }

    const paymentMethodTypes = product.paymentMethods.length > 0
      ? [...new Set(product.paymentMethods.map(m => stripeMethodMap[m] ?? 'card'))]
      : ['card']

    // Criar PaymentIntent no Stripe
    const pi = await stripe.paymentIntents.create({
      amount:               total,
      currency:             product.currency.toLowerCase(),
      payment_method_types: paymentMethodTypes,
      metadata: {
        productId:    product.id,
        productSlug:  product.slug,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
      },
    })

    // Criar registo de pagamento no banco
    const payment = await checkoutService.createPayment({
      productId:             product.id,
      amount:                total,
      currency:              product.currency,
      stripePaymentIntentId: pi.id,
      customerName:          body.customerName,
      customerEmail:         body.customerEmail,
      customerPhone:         body.customerPhone ?? '',
      metadata: {
        bumpIds:    body.bumpIds ?? [],
        shippingId: body.shippingId ?? null,
      },
    })

    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!

    return NextResponse.json({
      clientSecret:    pi.client_secret,
      paymentIntentId: pi.id,
      publishableKey,
      paymentId:       payment.id,
      amount:          total,
      currency:        product.currency,
    })
  } catch (err) {
    console.error('[checkout/payment-intent]', err)
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 })
  }
}
