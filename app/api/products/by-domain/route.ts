import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })

  const product = await prisma.product.findFirst({
    where:  { customDomain: domain, active: true },
    select: { id: true, slug: true },
  })

  if (!product?.slug) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ id: product.id, slug: product.slug })
}
