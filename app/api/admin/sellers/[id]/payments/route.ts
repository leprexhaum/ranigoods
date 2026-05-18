import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { adminService } from '@/lib/services/admin.service'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const sp = new URL(req.url).searchParams
  const start = sp.get('start') ?? undefined
  const end = sp.get('end') ?? undefined
  const limit = parseInt(sp.get('limit') ?? '50', 10)

  try {
    const payments = await adminService.getSellerPayments(id, start, end, limit)
    return NextResponse.json(payments.map(p => ({
      id: p.id,
      customer: p.customerName || 'Cliente',
      email: p.customerEmail,
      phone: p.customerPhone,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      method: p.paymentMethod || 'Cartão',
      product: p.product.name,
      cardLast4: p.cardLast4,
      cardBrand: p.cardBrand,
      createdAt: p.createdAt.toISOString(),
    })))
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar pagamentos' }, { status: 500 })
  }
}
