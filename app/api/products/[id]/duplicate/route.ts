import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { requireAuth } from '@/lib/api-auth'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const product = await productService.duplicate(params.id)
  if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  return NextResponse.json(product, { status: 201 })
}
