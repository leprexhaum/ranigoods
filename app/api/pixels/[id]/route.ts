import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const pixel = await pixelService.getById(params.id, auth.session.userId)
  if (!pixel) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(pixel)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const data    = await req.json()
  const updated = await pixelService.update(params.id, auth.session.userId, data)
  if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const ok = await pixelService.delete(params.id, auth.session.userId)
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true })
}
