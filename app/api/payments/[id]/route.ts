import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  // Buscar CheckoutPayment garantindo que pertence ao userId
  const cp = await prisma.checkoutPayment.findFirst({
    where:   { id: params.id, product: { userId: auth.session.userId } },
    include: { product: { select: { name: true } } },
  })
  if (!cp) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  logger.info('PAGAMENTO', 'Detalhe consultado', { userId: auth.session.userId, paymentId: params.id })

  const payment = {
    id:               cp.id,
    customer:         cp.customerName  || 'Cliente',
    email:            cp.customerEmail || '',
    amount:           cp.amount,
    status:           cp.status === 'paid' ? 'succeeded' : cp.status,
    date:             cp.createdAt.toISOString().slice(0, 10),
    createdAt:        cp.createdAt.toISOString(),
    product:          cp.product.name,
    method:           cp.paymentMethod || 'Cartão',
    cardLast4:        cp.cardLast4,
    cardBrand:        cp.cardBrand,
    cardCountry:      cp.cardCountry,
    riskLevel:        cp.riskLevel,
    riskScore:        0,
    fee:              cp.fee,
    net:              cp.net,
    stripeCustomerId: cp.stripeCustomerId,
    balanceTxId:      cp.balanceTxId,
    refundedAmount:   cp.refundedAmount,
  }

  const detail = {
    customerEmail:   cp.customerEmail,
    customerPhone:   cp.customerPhone,
    customerName:    cp.customerName,
    addressLine1:    cp.addressLine1,
    addressCity:     cp.addressCity,
    addressCountry:  cp.addressCountry,
    addressPostalCode: cp.addressPostalCode,
    cardLast4:       cp.cardLast4,
    cardBrand:       cp.cardBrand,
    cardCountry:     cp.cardCountry,
    riskLevel:       cp.riskLevel,
    fee:             cp.fee,
    net:             cp.net,
    balanceTxId:     cp.balanceTxId,
    upsellStatus:    cp.upsellStatus,
    upsellAmount:    cp.upsellAmount,
    disputeId:       cp.disputeId,
    disputeStatus:   cp.disputeStatus,
    stripeChargeId:  cp.stripeChargeId,
    urlParams:       cp.urlParams,
    paymentMethod:   cp.paymentMethod,
    stripeErrorCode: cp.stripeErrorCode,
    stripeErrorMsg:  cp.stripeErrorMsg,
    isAbandoned:     cp.isAbandoned,
    createdAt:       cp.createdAt.toISOString(),
    updatedAt:       cp.updatedAt.toISOString(),
    metadata:        cp.metadata,
  }

  return NextResponse.json({ ...payment, detail })
}
