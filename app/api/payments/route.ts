import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'
import type { PaymentsQuery, PaymentStatus, PaymentMethod } from '@/lib/types/payment'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const sp = new URL(req.url).searchParams

    const query: PaymentsQuery & { userId: string } = {
      userId: auth.session.userId,
      status: (sp.get('status') as PaymentStatus | 'all') ?? 'all',
      method: (sp.get('method') as PaymentMethod | 'all') ?? 'all',
      search: sp.get('search')  ?? undefined,
      start:  sp.get('start')   ?? undefined,
      end:    sp.get('end')     ?? undefined,
      page:   parseInt(sp.get('page')  ?? '1'),
      limit:  parseInt(sp.get('limit') ?? '20'),
    }

    const result = await paymentService.query(query)
    logger.info('PAGAMENTO', 'Listagem consultada', { userId: auth.session.userId, status: query.status, pagina: query.page, resultados: `${result.data.length}/${result.total}` })
    return NextResponse.json(result)
  } catch (err) {
    logger.error('PAGAMENTO', 'Erro ao listar pagamentos', { userId: auth.session.userId, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
