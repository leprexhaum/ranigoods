import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { domainService } from '@/lib/services/domain.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const domains = await domainService.list(auth.session.userId)
  return NextResponse.json(domains)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const body = await req.json() as { domain?: string }
  if (!body.domain?.trim()) return NextResponse.json({ error: 'Domínio é obrigatório' }, { status: 400 })

  // Validação básica de formato
  const clean = body.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(clean)) {
    return NextResponse.json({ error: 'Formato de domínio inválido' }, { status: 400 })
  }

  try {
    const domain = await domainService.create(auth.session.userId, clean)
    return NextResponse.json(domain, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Domínio já cadastrado' }, { status: 409 })
  }
}
