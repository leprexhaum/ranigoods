import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { domainService } from '@/lib/services/domain.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const domains = await domainService.list(auth.session.userId)
  logger.info('DOMÍNIO', 'Listagem consultada', { userId: auth.session.userId, total: domains.length })
  return NextResponse.json(domains)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const body = await req.json() as { domain?: string }
  if (!body.domain?.trim()) return NextResponse.json({ error: 'Domínio é obrigatório' }, { status: 400 })

  const clean = body.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(clean)) {
    return NextResponse.json({ error: 'Formato de domínio inválido' }, { status: 400 })
  }

  // Apenas domínios raiz — rejeitar subdomínios (ex: checkout.loja.com)
  // Permitir TLDs compostos: .com.br, .co.uk, .com.pt, etc.
  const COMPOUND_TLDS = ['com.br', 'com.pt', 'co.uk', 'com.au', 'co.nz', 'com.ar', 'com.mx', 'co.za', 'com.ng', 'org.br', 'net.br']
  const isCompoundTld = COMPOUND_TLDS.some(tld => clean.endsWith(`.${tld}`))
  const parts = clean.split('.')
  const maxParts = isCompoundTld ? 3 : 2
  if (parts.length > maxParts) {
    return NextResponse.json({ error: 'Apenas domínios raiz são permitidos (ex: meudominio.com). Configure subdomínios após adicionar.' }, { status: 400 })
  }

  try {
    const domain = await domainService.create(auth.session.userId, clean)
    logger.info('DOMÍNIO', 'Domínio criado via API', { userId: auth.session.userId, domain: clean })
    return NextResponse.json(domain, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao adicionar domínio'
    if (msg.includes('already exists') || msg.includes('Unique constraint')) {
      logger.warn('DOMÍNIO', 'Domínio duplicado', { userId: auth.session.userId, domain: clean })
      return NextResponse.json({ error: 'Domínio já cadastrado' }, { status: 409 })
    }
    logger.error('DOMÍNIO', 'Erro ao criar domínio', { userId: auth.session.userId, domain: clean, error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
