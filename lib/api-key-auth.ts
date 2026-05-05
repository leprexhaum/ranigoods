import { NextRequest, NextResponse } from 'next/server'
import { apiKeyService } from '@/lib/services/api-key.service'

export async function requireApiKey(req: NextRequest): Promise<{ userId: string } | NextResponse> {
  const auth = req.headers.get('authorization') ?? ''
  const raw  = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''

  if (!raw) {
    return NextResponse.json({ error: 'API key obrigatória' }, { status: 401 })
  }

  const userId = await apiKeyService.verify(raw)
  if (!userId) {
    return NextResponse.json({ error: 'API key inválida ou revogada' }, { status: 401 })
  }

  return { userId }
}
