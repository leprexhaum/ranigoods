import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const payment = await prisma.payment.findUnique({ where: { id: params.id } })
  if (!payment) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const cp = await prisma.checkoutPayment.findFirst({
    where:  { stripePaymentIntentId: params.id },
    select: {
      customerEmail: true, customerPhone: true, customerName: true,
      addressLine1: true, addressCity: true, addressCountry: true, addressPostalCode: true,
      cardLast4: true, cardBrand: true, cardCountry: true,
      riskLevel: true, fee: true, net: true, balanceTxId: true,
      upsellStatus: true, upsellAmount: true,
      disputeId: true, disputeStatus: true,
      stripeChargeId: true,
      urlParams: true,
      paymentMethod: true,
      stripeErrorCode: true, stripeErrorMsg: true,
      isAbandoned: true,
      createdAt: true, updatedAt: true,
      metadata: true,
    },
  })

  return NextResponse.json({ ...payment, detail: cp ?? null })
}
