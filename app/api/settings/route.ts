import { NextRequest, NextResponse } from 'next/server'
import { settingsService, type AppSettings } from '@/lib/services/settings.service'
import { requireAuth } from '@/lib/api-auth'

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
    return NextResponse.json(maskSecrets(await settingsService.get()))
  } catch (err) {
    console.error('[settings GET]', err)
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

    return NextResponse.json(maskSecrets(await settingsService.update(body)))
  } catch (err) {
    console.error('[settings PUT]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
