import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'

export async function GET(req: NextRequest) {
  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '50')
  return NextResponse.json(await pixelService.getLogs(limit))
}

export async function DELETE() {
  await pixelService.clearLogs()
  return NextResponse.json({ cleared: true })
}
