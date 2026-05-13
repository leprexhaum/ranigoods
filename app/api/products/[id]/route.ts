import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const product = await productService.getById(params.id)
  if (!product) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const data = await req.json()
  const updated = await productService.update(params.id, data)
  if (!updated) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  logger.info('PRODUTO', 'Produto atualizado', { productId: params.id, userId: auth.session.userId, campos: Object.keys(data).join(',') })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const ok = await productService.delete(params.id)
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  logger.info('PRODUTO', 'Produto arquivado', { productId: params.id, userId: auth.session.userId })
  return NextResponse.json({ deleted: true })
}
