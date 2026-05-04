import { NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const pixels = await pixelService.getAll()
    return NextResponse.json(
      pixels.map(p => ({
        id:              p.id,
        platform:        p.platform,
        pixelId:         p.pixelId,
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
