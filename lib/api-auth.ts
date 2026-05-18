import { NextResponse } from 'next/server'
import { getSession, type SessionPayload } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'samnkls'

export async function requireAuth(): Promise<{ session: SessionPayload } | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  // Verificar se o usuário está suspenso
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { suspended: true } })
  if (user?.suspended) {
    return NextResponse.json({ error: 'Conta suspensa' }, { status: 403 })
  }
  return { session }
}

export async function requireAdmin(): Promise<{ session: SessionPayload } | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  if (session.username !== ADMIN_USERNAME && session.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
  }
  return { session }
}
