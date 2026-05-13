import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pixelService } from '@/lib/services/pixel.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const productId = new URL(req.url).searchParams.get('productId')

    if (!productId) {
      return NextResponse.json([])
    }

    const product = await prisma.product.findUnique({
      where:  { id: productId },
      select: { pixelIds: true, userId: true },
    })

    if (!product) return NextResponse.json([])

    const pixelIds = (product.pixelIds as string[]) ?? []
    if (pixelIds.length === 0) return NextResponse.json([])

    const allPixels = await pixelService.getAll(product.userId)
    const filtered  = allPixels.filter(p => p.enabled && p.pixelId && pixelIds.includes(p.id))

    return NextResponse.json(
      filtered.map(p => ({
        id:              p.id,
        platform:        p.platform,
        pixelId:         p.pixelId,
        hasServerTracking: !!p.accessToken,
        enabled:         p.enabled,
        conversionLabel: p.conversionLabel,
        events:          p.events,
      })),
    )
  } catch (err) {
    logger.error('PIXEL', 'Erro ao carregar config', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json([], { status: 200 })
  }
}
