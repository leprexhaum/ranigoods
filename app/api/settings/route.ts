import { NextRequest, NextResponse } from 'next/server'
import { settingsService, type AppSettings } from '@/lib/services/settings.service'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function maskSecrets(s: AppSettings) {
  return {
    ...s,
    stripeSecret:  s.stripeSecret  ? '••••' + s.stripeSecret.slice(-4)  : '',
    webhookSecret: s.webhookSecret ? '••••' + s.webhookSecret.slice(-4) : '',
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    logger.info('CONFIG', 'Configurações consultadas', { userId: auth.session.userId })
    return NextResponse.json(maskSecrets(await settingsService.get()))
  } catch (err) {
    logger.error('CONFIG', 'Erro ao consultar configurações', { userId: auth.session.userId, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json() as Record<string, unknown>

    if (typeof body.stripeSecret  === 'string' && body.stripeSecret.startsWith('••••'))  delete body.stripeSecret
    if (typeof body.webhookSecret === 'string' && body.webhookSecret.startsWith('••••')) delete body.webhookSecret

    const result = await settingsService.update(body)
    logger.info('CONFIG', 'Configurações atualizadas', { userId: auth.session.userId, campos: Object.keys(body).join(',') })
    return NextResponse.json(maskSecrets(result))
  } catch (err) {
    logger.error('CONFIG', 'Erro ao atualizar configurações', { userId: auth.session.userId, error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
