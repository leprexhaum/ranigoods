import { NextRequest, NextResponse } from 'next/server'
import { paymentService } from '@/lib/services/payment.service'
import { requireAuth } from '@/lib/api-auth'
import type { PaymentStatus, PaymentMethod } from '@/lib/types/payment'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const sp = new URL(req.url).searchParams
  const { data } = await paymentService.query({
    userId: auth.session.userId,
    status: (sp.get('status') as PaymentStatus | 'all') ?? 'all',
    method: (sp.get('method') as PaymentMethod | 'all') ?? 'all',
    search: sp.get('search') ?? undefined,
    start:  sp.get('start')  ?? undefined,
    end:    sp.get('end')    ?? undefined,
    page:   1,
    limit:  10000,
  })

  const header = ['ID', 'Cliente', 'Email', 'Produto', 'Método', 'Valor (centavos)', 'Status', 'Data']
  const rows = data.map(p => [
    p.id,
    `"${p.customer.replace(/"/g, '""')}"`,
    p.email,
    `"${p.product.replace(/"/g, '""')}"`,
    p.method,
    p.amount,
    p.status,
    p.date,
  ])

  const csv = [header, ...rows].map(r => r.join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pagamentos-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
