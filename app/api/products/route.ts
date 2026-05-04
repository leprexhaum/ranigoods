import { NextRequest, NextResponse } from 'next/server'
import { productService } from '@/lib/services/product.service'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const sp     = new URL(req.url).searchParams
    const status = sp.get('status') as 'active' | 'archived' | null
    return NextResponse.json(await productService.getAll(status ?? undefined))
  } catch (err) {
    console.error('[products GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { name, price, interval, stripeId, status } = body

    if (!name || !price || !interval) {
      return NextResponse.json({ error: 'name, price e interval são obrigatórios' }, { status: 400 })
    }

    const product = await productService.create({
      name,
      price:    Number(price),
      interval,
      stripeId: stripeId ?? '',
      status:   status ?? 'active',
      sales:    0,
      revenue:  0,
    })

    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    console.error('[products POST]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

