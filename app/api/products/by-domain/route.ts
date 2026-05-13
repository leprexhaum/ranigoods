import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })

  // 1. Tenta por customDomain direto no produto (legado)
  const byProduct = await prisma.product.findFirst({
    where:  { customDomain: domain, active: true },
    select: { id: true, slug: true },
  })
  if (byProduct?.slug) {
    logger.info('DOMÍNIO', 'Produto encontrado por customDomain', { domain, productId: byProduct.id })
    return NextResponse.json({ id: byProduct.id, slug: byProduct.slug })
  }

  // 2. Tenta por CustomDomain global do usuário → primeiro produto ativo do userId
  const customDomain = await prisma.customDomain.findUnique({
    where: { domain },
  })
  if (!customDomain || customDomain.status !== 'active') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const product = await prisma.product.findFirst({
    where:  { userId: customDomain.userId, active: true },
    select: { id: true, slug: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!product?.slug) return NextResponse.json({ error: 'not found' }, { status: 404 })
  logger.info('DOMÍNIO', 'Produto encontrado por CustomDomain global', { domain, productId: product.id })
  return NextResponse.json({ id: product.id, slug: product.slug })
}
