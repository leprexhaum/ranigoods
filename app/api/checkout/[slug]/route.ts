import { NextRequest, NextResponse } from 'next/server'
import { checkoutService } from '@/lib/services/checkout.service'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const product = await checkoutService.getProductBySlug(params.slug)
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }
    return NextResponse.json(product)
  } catch (err) {
    console.error('[checkout/slug GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
