import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { cartService } from '@/lib/services/cart.service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { cartId: string } },
) {
  try {
    const cart = await cartService.getById(params.cartId)

    if (!cart) {
      return NextResponse.json({ error: 'Carrinho não encontrado' }, { status: 404 })
    }
    if (cart.status === 'expired' || new Date(cart.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Este carrinho expirou' }, { status: 410 })
    }
    if (cart.status === 'paid') {
      return NextResponse.json({ error: 'Este carrinho já foi pago' }, { status: 410 })
    }

    const body = await req.json()
    const customerName  = (body.customerName  ?? '').trim()
    const customerEmail = (body.customerEmail ?? '').trim()
    const customerPhone = (body.customerPhone ?? '').trim()
    const urlParams     = (body.urlParams && typeof body.urlParams === 'object') ? body.urlParams : {}

    if (!customerName || !customerEmail) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map(item => ({
      price_data: {
        currency:     cart.currency.toLowerCase(),
        unit_amount:  item.unitPrice,
        product_data: {
          name:   item.name,
          images: item.imageUrl ? [item.imageUrl] : [],
        },
      },
      quantity: item.quantity,
    }))

    const session = await stripe.checkout.sessions.create({
      mode:               'payment',
      line_items:         lineItems,
      success_url:        `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=cart`,
      cancel_url:         `${baseUrl}/checkout/cart/${params.cartId}`,
      customer_email:     customerEmail,
      expires_at:         Math.floor(Math.min(new Date(cart.expiresAt).getTime(), Date.now() + 30 * 60 * 1000) / 1000),
      metadata: {
        type:          'cart',
        cartId:        params.cartId,
        userId:        cart.userId,
        customerName,
        customerEmail,
        customerPhone,
      },
    })

    // Guardar dados do cliente e sessionId no cart
    await prisma.cart.update({
      where: { id: params.cartId },
      data: {
        stripeSessionId: session.id,
        customerName,
        customerEmail,
        customerPhone,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        urlParams: urlParams as any,
      },
    })

    logger.info('PEDIDO', 'Sessão Stripe criada', { cartId: params.cartId, sessionId: session.id })

    return NextResponse.json({ sessionUrl: session.url })
  } catch (err) {
    logger.error('PEDIDO', 'Erro ao criar sessão', { cartId: params.cartId, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro ao criar sessão de pagamento' }, { status: 500 })
  }
}
