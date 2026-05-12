import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pixelService } from '@/lib/services/pixel.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const productId = new URL(req.url).searchParams.get('productId')

    if (!productId) {
      // Sem productId: não expor pixels globalmente
      return NextResponse.json([])
    }

    // Buscar produto e seus pixelIds
    const product = await prisma.product.findUnique({
      where:  { id: productId },
      select: { pixelIds: true, userId: true },
    })

    if (!product) return NextResponse.json([])

    const pixelIds = (product.pixelIds as string[]) ?? []
    if (pixelIds.length === 0) return NextResponse.json([])

    // Buscar só os pixels ativos desse produto
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
    console.error('[pixels/config]', err)
    return NextResponse.json([], { status: 200 })
  }
}
