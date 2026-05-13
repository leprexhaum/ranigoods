import { NextRequest, NextResponse } from 'next/server'
import { requireApiKey } from '@/lib/api-key-auth'
import { cartService } from '@/lib/services/cart.service'
import { logger } from '@/lib/logger'

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

  logger.info('PEDIDO', 'Carrinho consultado via API v1', { userId: auth.userId, cartId: params.id })
  return NextResponse.json(cart)
}
