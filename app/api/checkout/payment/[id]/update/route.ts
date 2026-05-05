import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

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
    })
    if (!payment) {
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[checkout/payment/update]', err)
    return NextResponse.json({ error: 'Erro ao atualizar pagamento' }, { status: 500 })
  }
}
