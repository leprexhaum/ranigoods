import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { abandonedCartService } from '@/lib/services/abandoned-cart.service'
import { logger } from '@/lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { customerName, customerEmail, customerPhone, addressLine1, addressLine2, addressCity, addressPostalCode, addressCountry, amount } = await req.json() as {
      customerName?:  string
      customerEmail?: string
      customerPhone?: string
      addressLine1?: string
      addressLine2?: string
      addressCity?: string
      addressPostalCode?: string
      addressCountry?: string
      amount?: number
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
    if (addressLine1?.trim())      data.addressLine1      = addressLine1.trim()
    if (addressLine2?.trim())      data.addressLine2      = addressLine2.trim()
    if (addressCity?.trim())       data.addressCity       = addressCity.trim()
    if (addressPostalCode?.trim()) data.addressPostalCode = addressPostalCode.trim()
    if (addressCountry?.trim())    data.addressCountry    = addressCountry.trim()

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true })
    }

    await prisma.checkoutPayment.update({ where: { id: params.id }, data })

    // Atualizar amount no Stripe e no banco se solicitado
    if (amount && amount > 0 && amount !== payment.amount && payment.stripePaymentIntentId) {
      await stripe.paymentIntents.update(payment.stripePaymentIntentId, { amount })
        .catch(err => logger.warn('CHECKOUT', 'Falha ao atualizar amount no Stripe', { piId: payment.stripePaymentIntentId, error: err instanceof Error ? err.message : String(err) }))
      await prisma.checkoutPayment.update({ where: { id: params.id }, data: { amount } })
    }

    // Sincronizar metadata e shipping no PaymentIntent do Stripe
    if (payment.stripePaymentIntentId) {
      const piUpdate: Stripe.PaymentIntentUpdateParams = {}

      // Metadata com dados do cliente
      const meta: Record<string, string> = {}
      if (data.customerName)  meta.customerName  = data.customerName
      if (data.customerEmail) meta.customerEmail = data.customerEmail
      if (data.customerPhone) meta.customerPhone = data.customerPhone
      if (Object.keys(meta).length > 0) {
        piUpdate.metadata = meta
      }

      // Shipping melhora score de frictionless 3DS e reduz recusas
      const line1 = data.addressLine1 || addressLine1
      if (line1) {
        piUpdate.shipping = {
          name:    data.customerName || 'Cliente',
          phone:   data.customerPhone || undefined,
          address: {
            line1:       line1,
            line2:       data.addressLine2 || addressLine2 || undefined,
            city:        data.addressCity || addressCity || undefined,
            postal_code: data.addressPostalCode || addressPostalCode || undefined,
            country:     data.addressCountry || addressCountry || 'PT',
          },
        }
      }

      if (Object.keys(piUpdate).length > 0) {
        await stripe.paymentIntents.update(payment.stripePaymentIntentId, piUpdate)
          .catch(err => logger.warn('CHECKOUT', 'Falha ao atualizar PI no Stripe', { piId: payment.stripePaymentIntentId, error: err instanceof Error ? err.message : String(err) }))
      }
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
    logger.error('CHECKOUT', 'Erro ao atualizar pagamento', { paymentId: params.id, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro ao atualizar pagamento' }, { status: 500 })
  }
}
