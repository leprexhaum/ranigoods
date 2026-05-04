import { NextRequest, NextResponse } from 'next/server'
import { checkoutService } from '@/lib/services/checkout.service'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payment = await checkoutService.getPaymentById(params.id)
    if (!payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
    }
    return NextResponse.json(payment)
  } catch (err) {
    console.error('[checkout/payment GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
