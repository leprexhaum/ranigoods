import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import type { PaymentsQuery, PaymentStatus, PaymentMethod } from '@/lib/types/payment'

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams

  const query: PaymentsQuery = {
    status: (sp.get('status') as PaymentStatus | 'all') ?? 'all',
    method: (sp.get('method') as PaymentMethod | 'all') ?? 'all',
    search: sp.get('search')  ?? undefined,
    start:  sp.get('start')   ?? undefined,
    end:    sp.get('end')     ?? undefined,
    page:   parseInt(sp.get('page')  ?? '1'),
    limit:  parseInt(sp.get('limit') ?? '20'),
  }

  const result = await paymentService.query(query)
  return NextResponse.json(result)
}
