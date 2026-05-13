import { NextRequest, NextResponse } from 'next/server'
import { checkoutService } from '@/lib/services/checkout.service'
import { logger } from '@/lib/logger'

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
    logger.error('CHECKOUT', 'Erro ao consultar pagamento', { paymentId: params.id, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
