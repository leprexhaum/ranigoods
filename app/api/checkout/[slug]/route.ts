import { NextRequest, NextResponse } from 'next/server'
import { checkoutService } from '@/lib/services/checkout.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const product = await checkoutService.getProductBySlug(params.slug)
    if (!product) {
      logger.warn('CHECKOUT', 'Produto não encontrado', { slug: params.slug })
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }
    logger.info('CHECKOUT', 'Produto consultado', { slug: params.slug, productId: product.id, status: 'encontrado' })
    return NextResponse.json(product)
  } catch (err) {
    logger.error('CHECKOUT', 'Erro ao consultar produto', { slug: params.slug, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
