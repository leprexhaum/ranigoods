import { NextRequest, NextResponse } from 'next/server'
import { pixelService } from '@/lib/services/pixel.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const pixel = await pixelService.getById(params.id)
  if (!pixel) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(pixel)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const data = await req.json()
  const updated = await pixelService.update(params.id, data)
  if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(updated)
}
