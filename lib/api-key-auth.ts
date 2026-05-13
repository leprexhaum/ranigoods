import { NextRequest, NextResponse } from 'next/server'
import { apiKeyService } from '@/lib/services/api-key.service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function requireApiKey(req: NextRequest): Promise<{ userId: string; username: string } | NextResponse> {
  const auth = req.headers.get('authorization') ?? ''
  const raw  = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const ip   = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const endpoint = req.nextUrl.pathname
  const method   = req.method

  if (!raw) {
    return NextResponse.json({ error: 'API key obrigatória' }, { status: 401 })
  }

  const prefix = raw.slice(0, 12)
  const userId = await apiKeyService.verify(raw)
  if (!userId) {
    logger.warn('API-KEY', 'Chave inválida ou revogada', { prefix, endpoint, ip })
    return NextResponse.json({ error: 'API key inválida ou revogada' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
  logger.info('API-KEY', 'Acesso via API Key', { prefix, endpoint, method })
  return { userId, username: user?.username ?? 'unknown' }
}
