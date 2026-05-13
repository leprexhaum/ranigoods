import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { encrypt, decryptIfNotEmpty } from '@/lib/crypto'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const SENSITIVE_KEYS = new Set([
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_DEVELOPER_TOKEN',
])

const ALLOWED_KEYS = new Set([
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REDIRECT_URI',
])

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const rows = await prisma.platformConfig.findMany({
    where:   { key: { in: [...ALLOWED_KEYS] } },
    orderBy: { key: 'asc' },
  })

  const result = rows.map(r => ({
    key:   r.key,
    value: r.encrypted ? (r.value ? '••••••••' : '') : r.value,
    set:   r.value !== '',
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as { key?: string; value?: string }
  if (!body.key || !ALLOWED_KEYS.has(body.key)) {
    return NextResponse.json({ error: 'Chave inválida' }, { status: 400 })
  }

  const isSensitive  = SENSITIVE_KEYS.has(body.key)
  const value        = body.value?.trim() ?? ''
  const storedValue  = isSensitive && value ? encrypt(value) : value

  const row = await prisma.platformConfig.upsert({
    where:  { key: body.key },
    create: { key: body.key, value: storedValue, encrypted: isSensitive },
    update: { value: storedValue, encrypted: isSensitive },
  })

  logger.info('CONFIG', 'Platform config atualizada', { userId: auth.session.userId, key: body.key })
  return NextResponse.json({ key: row.key, set: row.value !== '' })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  if (!key || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: 'Chave inválida' }, { status: 400 })
  }

  await prisma.platformConfig.deleteMany({ where: { key } })
  logger.info('CONFIG', 'Platform config removida', { userId: auth.session.userId, key })
  return NextResponse.json({ ok: true })
}
