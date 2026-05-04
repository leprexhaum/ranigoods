import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '50')
  return NextResponse.json(await pixelService.getLogs(limit))
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  await pixelService.clearLogs()
  return NextResponse.json({ cleared: true })
}
