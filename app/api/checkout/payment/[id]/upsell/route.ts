import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { funnelService } from '@/lib/services/funnel.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const payment = await prisma.checkoutPayment.findUnique({
    where:  { id: params.id },
    select: { productId: true, status: true, upsellStatus: true },
  })

  if (!payment || payment.status !== 'paid') {
    return NextResponse.json({ upsell: null })
  }

  if (payment.upsellStatus !== 'none') {
    return NextResponse.json({ upsell: null })
  }

  const funnel = await funnelService.getByProductId(payment.productId)
  if (!funnel) return NextResponse.json({ upsell: null })

  const upsellProduct = await prisma.product.findUnique({
    where:  { id: funnel.upsellId },
    select: { id: true, name: true, description: true, imageUrl: true, price: true, currency: true },
  })
  if (!upsellProduct) return NextResponse.json({ upsell: null })

  const price = funnel.upsellPrice > 0 ? funnel.upsellPrice : upsellProduct.price

  logger.info('UPSELL', 'Oferta apresentada', { paymentId: params.id, upsellProductId: upsellProduct.id, upsellAmount: price })

  return NextResponse.json({
    upsell: {
      funnelId:    funnel.id,
      productId:   upsellProduct.id,
      title:       funnel.upsellTitle || upsellProduct.name,
      description: funnel.upsellDesc  || upsellProduct.description,
      image:       funnel.upsellImage || upsellProduct.imageUrl,
      price,
      currency:    upsellProduct.currency,
    },
  })
}
