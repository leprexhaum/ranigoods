import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { apiKeyService } from '@/lib/services/api-key.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const keys = await apiKeyService.list(auth.session.userId)
  return NextResponse.json(keys)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  const { record, plaintext } = await apiKeyService.generate(auth.session.userId, name)
  logger.info('API-KEY', 'Chave criada', { userId: auth.session.userId, prefix: record.keyPrefix, nome: name })
  return NextResponse.json({ ...record, key: plaintext }, { status: 201 })
}
