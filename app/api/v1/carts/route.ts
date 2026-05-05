import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api-key-auth'
import { cartService } from '@/lib/services/cart.service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireApiKey(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'items é obrigatório e deve ser um array não vazio' }, { status: 400 })
    }

    for (const item of body.items) {
      if (!item.productId || typeof item.productId !== 'string') {
        return NextResponse.json({ error: 'Cada item precisa de productId (string)' }, { status: 400 })
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        return NextResponse.json({ error: 'Cada item precisa de quantity (número >= 1)' }, { status: 400 })
      }
    }

    const urlParams = (body.urlParams && typeof body.urlParams === 'object') ? body.urlParams : {}

    const result = await cartService.create(auth.userId, body.items, urlParams)

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    const isClientError = msg.includes('não encontrado') || msg.includes('não pertence') ||
      msg.includes('Quantidade') || msg.includes('disponível') || msg.includes('moeda')
    return NextResponse.json({ error: msg }, { status: isClientError ? 400 : 500 })
  }
}
