import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  await prisma.checkoutPayment.updateMany({
    where: { id: params.id, upsellStatus: 'none' },
    data:  { upsellStatus: 'declined' },
  })
  return NextResponse.json({ success: true })
}
