import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })

  // 1. Busca direta pelo domínio exato (domínio raiz)
  let customDomain = await prisma.customDomain.findUnique({
    where: { domain },
  })

  // 2. Se não encontrou, tentar resolver como subdomínio
  // Ex: checkout.loja.com → buscar "loja.com" e verificar se "checkout" está nos subdomains
  if (!customDomain) {
    const parts = domain.split('.')
    if (parts.length >= 3) {
      const subdomain = parts[0]
      const rootDomain = parts.slice(1).join('.')
      const rootRecord = await prisma.customDomain.findUnique({
        where: { domain: rootDomain },
      })
      if (rootRecord && rootRecord.status === 'active') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subs = ((rootRecord as any).subdomains as string[]) ?? []
        if (subs.includes(subdomain)) {
          customDomain = rootRecord
        }
      }
      // Tentar também com TLD composto (ex: pay.loja.com.br → "loja.com.br")
      if (!customDomain && parts.length >= 4) {
        const subdomainAlt = parts[0]
        const rootDomainAlt = parts.slice(1).join('.')
        const rootRecordAlt = await prisma.customDomain.findUnique({
          where: { domain: rootDomainAlt },
        })
        if (rootRecordAlt && rootRecordAlt.status === 'active') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const subs = ((rootRecordAlt as any).subdomains as string[]) ?? []
          if (subs.includes(subdomainAlt)) {
            customDomain = rootRecordAlt
          }
        }
      }
    }
  }

  if (!customDomain || customDomain.status !== 'active') {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const product = await prisma.product.findFirst({
    where:  { userId: customDomain.userId, active: true },
    select: { id: true, slug: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!product?.slug) return NextResponse.json({ error: 'not found' }, { status: 404 })
  logger.info('DOMÍNIO', 'Produto encontrado por CustomDomain', { domain, productId: product.id })
  return NextResponse.json({ id: product.id, slug: product.slug })
}
