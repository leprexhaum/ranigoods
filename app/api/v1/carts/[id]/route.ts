import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api-key-auth'
import { cartService } from '@/lib/services/cart.service'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireApiKey(req)
  if (auth instanceof NextResponse) return auth

  const cart = await cartService.getById(params.id)
  if (!cart) return NextResponse.json({ error: 'Carrinho não encontrado' }, { status: 404 })
  if (cart.userId !== auth.userId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  return NextResponse.json(cart)
}
