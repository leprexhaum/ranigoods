import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { getGoogleAdsCredentials } from '@/lib/services/platform-config.service'
import { encrypt } from '@/lib/crypto'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth

  const { clientId, redirectUri } = await getGoogleAdsCredentials()

  if (!clientId || !redirectUri) {
    logger.warn('PIXEL', 'Google Ads não configurado', { username: session.username })
    return NextResponse.json(
      { error: 'Google Ads não configurado. Configure as credenciais no painel de administração.' },
      { status: 400 },
    )
  }

  // state carrega o userId criptografado para validação CSRF no callback
  const state = encrypt(session.userId)
  logger.info('PIXEL', 'Google Ads OAuth iniciado', { username: session.username })

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/adwords',
    access_type:   'offline',
    prompt:        'consent',
    state,
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  )
}
