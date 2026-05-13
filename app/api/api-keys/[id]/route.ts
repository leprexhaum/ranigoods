import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { apiKeyService } from '@/lib/services/api-key.service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const ok = await apiKeyService.revoke(params.id, auth.session.userId)
  if (!ok) return NextResponse.json({ error: 'Key não encontrada' }, { status: 404 })
  logger.info('API-KEY', 'Chave revogada', { username: auth.session.username, keyId: params.id })
  return NextResponse.json({ success: true })
}
