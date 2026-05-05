import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { funnelService } from '@/lib/services/funnel.service'

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

  // Já respondeu ao upsell
  if (payment.upsellStatus !== 'none') {
    return NextResponse.json({ upsell: null })
  }

  const funnel = await funnelService.getByProductId(payment.productId)
  if (!funnel) return NextResponse.json({ upsell: null })

  // Buscar dados do produto de upsell
  const upsellProduct = await prisma.product.findUnique({
    where:  { id: funnel.upsellId },
    select: { id: true, name: true, description: true, imageUrl: true, price: true, currency: true },
  })
  if (!upsellProduct) return NextResponse.json({ upsell: null })

  const price = funnel.upsellPrice > 0 ? funnel.upsellPrice : upsellProduct.price

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
