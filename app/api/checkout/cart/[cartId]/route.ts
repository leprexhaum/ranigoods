import { NextRequest, NextResponse } from 'next/server'
import { cartService } from '@/lib/services/cart.service'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { cartId: string } },
) {
  const cart = await cartService.getById(params.cartId)

  if (!cart) {
    return NextResponse.json({ error: 'Carrinho não encontrado' }, { status: 404 })
  }

  if (cart.status === 'expired' || new Date(cart.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'Este carrinho expirou', expired: true }, { status: 410 })
  }

  if (cart.status === 'paid') {
    return NextResponse.json({ error: 'Este carrinho já foi pago', paid: true }, { status: 410 })
  }

  return NextResponse.json(cart)
}
