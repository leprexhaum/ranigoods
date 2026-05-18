import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { adminService } from '@/lib/services/admin.service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const sp = new URL(req.url).searchParams
  const start = sp.get('start') ?? undefined
  const end = sp.get('end') ?? undefined

  try {
    const sellers = await adminService.listSellers(start, end)

    const header = 'Username,Email,Role,Status,Produtos,Faturamento (EUR),Vendas,Falhas,Taxa Conversão (%),Cadastro'
    const rows = sellers.map(s =>
      `${s.username},${s.email},${s.role},${s.suspended ? 'Suspenso' : 'Ativo'},${s.products},${(s.faturamento / 100).toFixed(2)},${s.vendas},${s.falhas},${s.taxaConversao},${s.createdAt.slice(0, 10)}`
    )
    const csv = [header, ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sellers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 })
  }
}
