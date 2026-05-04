import { NextResponse } from 'next/server'
import { getSession, type SessionPayload } from '@/lib/auth'

export async function requireAuth(): Promise<{ session: SessionPayload } | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  return { session }
}
