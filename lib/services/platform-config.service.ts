import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { decryptIfNotEmpty } from '@/lib/crypto'

export async function getPlatformConfig(key: string): Promise<string> {
  const row = await prisma.platformConfig.findUnique({ where: { key } })
  if (!row || !row.value) {
    logger.warn('CONFIG', 'Platform config não encontrada', { key })
    return ''
  }
  return row.encrypted ? decryptIfNotEmpty(row.value) : row.value
}

export async function getGoogleAdsCredentials(): Promise<{
  developerToken: string
  clientId: string
  clientSecret: string
  redirectUri: string
}> {
  const [developerToken, clientId, clientSecret, redirectUri] = await Promise.all([
    getPlatformConfig('GOOGLE_ADS_DEVELOPER_TOKEN'),
    getPlatformConfig('GOOGLE_ADS_CLIENT_ID'),
    getPlatformConfig('GOOGLE_ADS_CLIENT_SECRET'),
    getPlatformConfig('GOOGLE_ADS_REDIRECT_URI'),
  ])
  return { developerToken, clientId, clientSecret, redirectUri }
}
