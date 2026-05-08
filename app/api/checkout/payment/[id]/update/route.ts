import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { abandonedCartService } from '@/lib/services/abandoned-cart.service'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { customerName, customerEmail, customerPhone } = await req.json() as {
      customerName?:  string
      customerEmail?: string
      customerPhone?: string
    }

    const payment = await prisma.checkoutPayment.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, stripePaymentIntentId: true, productId: true, amount: true, currency: true },
    })
    // Só permite atualizar pagamentos ainda não concluídos
    if (!payment || payment.status === 'paid' || payment.status === 'refunded') {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }

    // Só atualiza campos que vieram preenchidos
    const data: Record<string, string> = {}
    if (customerName?.trim())  data.customerName  = customerName.trim()
    if (customerEmail?.trim()) data.customerEmail = customerEmail.trim()
    if (customerPhone?.trim()) data.customerPhone = customerPhone.trim()

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true })
    }

    await prisma.checkoutPayment.update({ where: { id: params.id }, data })

    // Sincronizar metadata no PaymentIntent do Stripe
    if (payment.stripePaymentIntentId) {
      const meta: Record<string, string> = {}
      if (data.customerName)  meta.customerName  = data.customerName
      if (data.customerEmail) meta.customerEmail = data.customerEmail
      await stripe.paymentIntents.update(payment.stripePaymentIntentId, { metadata: meta })
        .catch(err => console.warn('[update-payment] stripe metadata update failed:', err))
    }

    // Criar/atualizar registo de carrinho abandonado com os dados do cliente
    if (payment.stripePaymentIntentId && (data.customerEmail || data.customerName)) {
      const current = await prisma.checkoutPayment.findUnique({
        where: { id: params.id },
        select: { customerName: true, customerEmail: true, customerPhone: true },
      })
      await abandonedCartService.create({
        productId:             payment.productId,
        stripePaymentIntentId: payment.stripePaymentIntentId,
        customerName:          data.customerName  ?? current?.customerName  ?? '',
        customerEmail:         data.customerEmail ?? current?.customerEmail ?? '',
        customerPhone:         data.customerPhone ?? current?.customerPhone ?? '',
        amount:                payment.amount,
        currency:              payment.currency,
        urlParams:             {},
        bumpIds:               [],
        shippingId:            '',
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[checkout/payment/update]', err)
    return NextResponse.json({ error: 'Erro ao atualizar pagamento' }, { status: 500 })
  }
}
