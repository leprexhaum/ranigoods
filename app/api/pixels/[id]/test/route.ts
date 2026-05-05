import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'
import { requireAuth } from '@/lib/api-auth'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body      = await req.json().catch(() => ({})) as { event?: string }
  const eventName = body.event ?? 'Purchase'
  const result    = await pixelService.testEvent(params.id, auth.session.userId, eventName)
  return NextResponse.json(result)
}
