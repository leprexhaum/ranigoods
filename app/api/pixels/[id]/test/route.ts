import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json().catch(() => ({})) as { event?: string }
  const eventName = body.event ?? 'Purchase'
  const result = await pixelService.testEvent(params.id, eventName)
  return NextResponse.json(result)
}
