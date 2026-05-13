import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGoogleAdsCredentials } from '@/lib/services/platform-config.service'
import { decrypt, encrypt } from '@/lib/crypto'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appHost = process.env.NEXT_PUBLIC_APP_HOST ?? 'techpags.shop'
  const baseUrl = `https://${appHost}`

  if (error) {
    logger.warn('PIXEL', 'Google Ads OAuth negado', { error })
    return NextResponse.redirect(`${baseUrl}/pixels?error=google_ads_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/pixels?error=google_ads_invalid`)
  }

  // Validar state — deve ser o userId criptografado
  let userId: string
  try {
    userId = decrypt(state)
  } catch {
    return NextResponse.redirect(`${baseUrl}/pixels?error=google_ads_csrf`)
  }

  const { clientId, clientSecret, redirectUri } = await getGoogleAdsCredentials()
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(`${baseUrl}/pixels?error=google_ads_config`)
  }

  // Trocar code por refresh_token
  let refreshToken: string
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }).toString(),
    })
    const json = await res.json() as { refresh_token?: string; error?: string; error_description?: string }
    if (!res.ok || !json.refresh_token) {
      throw new Error(json.error_description ?? json.error ?? `HTTP ${res.status}`)
    }
    refreshToken = json.refresh_token
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.redirect(`${baseUrl}/pixels?error=google_ads_token&detail=${encodeURIComponent(msg)}`)
  }

  // Salvar refresh_token criptografado no primeiro PixelConfig google_ads do merchant
  // Se não existir nenhum, criar um placeholder para o merchant configurar depois
  const existing = await prisma.pixelConfig.findFirst({
    where: { userId, platform: 'google_ads' },
    orderBy: { createdAt: 'asc' },
  })

  const encryptedToken = encrypt(refreshToken)

  if (existing) {
    await prisma.pixelConfig.update({
      where: { id: existing.id },
      data:  { refreshToken: encryptedToken },
    })
  } else {
    await prisma.pixelConfig.create({
      data: {
        userId,
        platform:     'google_ads',
        name:         'Google Ads',
        refreshToken: encryptedToken,
        enabled:      false,
        events:       [],
      },
    })
  }

  logger.info('PIXEL', 'Google Ads OAuth concluído', { userId })
  return NextResponse.redirect(`${baseUrl}/pixels?success=google_ads_connected`)
}
