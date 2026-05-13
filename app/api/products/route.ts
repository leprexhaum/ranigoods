import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const sp     = new URL(req.url).searchParams
    const status = sp.get('status') as 'active' | 'archived' | null
    const { userId } = auth.session
    const products = await productService.getAll(userId, status ?? undefined)
    logger.info('PRODUTO', 'Listagem consultada', { userId, filtro: status ?? 'all', total: products.length })
    return NextResponse.json(products)
  } catch (err) {
    logger.error('PRODUTO', 'Erro ao listar produtos', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { name, price, interval } = body
    const { userId } = auth.session

    if (!name || !price || !interval) {
      return NextResponse.json({ error: 'name, price e interval são obrigatórios' }, { status: 400 })
    }

    const product = await productService.create({
      userId,
      name,
      price:            Number(price),
      interval,
      stripeId:         body.stripeId         ?? '',
      status:           body.status           ?? 'active',
      slug:             body.slug             ?? null,
      currency:         body.currency         ?? 'EUR',
      description:      body.description      ?? '',
      imageUrl:         body.imageUrl         ?? '',
      defaultShipping:  Number(body.defaultShipping ?? 0),
      paymentMethods:   body.paymentMethods   ?? ['card'],
      shippingOptions:  body.shippingOptions  ?? [],
      orderBumps:       body.orderBumps       ?? [],
      reviews:          body.reviews          ?? [],
      showReviews:      body.showReviews      ?? false,
      checkoutTemplate: body.checkoutTemplate ?? 'single_step',
      checkoutLanguage: body.checkoutLanguage ?? 'pt',
      requirePhone:     body.requirePhone     ?? false,
      requireAddress:   body.requireAddress   ?? false,
      logoUrl:          body.logoUrl          ?? '',
      brandName:        body.brandName        ?? '',
      legalName:        body.legalName        ?? '',
      successUrl:       body.successUrl       ?? '',
      metaPixelId:      body.metaPixelId      ?? '',
      utmifyConfigId:   body.utmifyConfigId   ?? null,
      utmifyConfigIds:  body.utmifyConfigIds  ?? [],
      stock:            body.stock !== undefined ? Number(body.stock) : -1,
      pixelIds:         body.pixelIds ?? [],
    })

    logger.info('PRODUTO', 'Produto criado', { productId: product.id, userId, nome: name, preco: price, moeda: body.currency ?? 'EUR' })
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    logger.error('PRODUTO', 'Erro ao criar produto', { userId: auth.session.userId, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
