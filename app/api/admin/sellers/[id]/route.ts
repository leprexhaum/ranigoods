import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { adminService } from '@/lib/services/admin.service'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const sp = new URL(req.url).searchParams
  const start = sp.get('start') ?? undefined
  const end = sp.get('end') ?? undefined

  try {
    const seller = await adminService.getSellerDetail(params.id, start, end)
    if (!seller) return NextResponse.json({ error: 'Seller não encontrado' }, { status: 404 })

    const products = await adminService.getSellerProducts(params.id)
    return NextResponse.json({ seller, products })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar seller' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json() as { action: string; role?: string }
    const { action } = body

    switch (action) {
      case 'suspend':
        await adminService.suspendSeller(params.id)
        return NextResponse.json({ success: true, message: 'Seller suspenso' })

      case 'activate':
        await adminService.activateSeller(params.id)
        return NextResponse.json({ success: true, message: 'Seller reativado' })

      case 'role':
        if (!body.role || !['user', 'admin'].includes(body.role)) {
          return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
        }
        await adminService.updateRole(params.id, body.role)
        return NextResponse.json({ success: true, message: `Role alterado para ${body.role}` })

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao executar ação' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  try {
    const deleted = await adminService.deleteSeller(params.id)
    if (!deleted) return NextResponse.json({ error: 'Seller não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true, message: 'Seller deletado' })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao deletar seller' }, { status: 500 })
  }
}
