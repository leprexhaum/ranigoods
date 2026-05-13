import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  await prisma.checkoutPayment.updateMany({
    where: { id: params.id, upsellStatus: 'none' },
    data:  { upsellStatus: 'declined' },
  })
  logger.info('UPSELL', 'Oferta recusada', { paymentId: params.id })
  return NextResponse.json({ success: true })
}
