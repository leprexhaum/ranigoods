import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { userService } from '@/lib/services/user.service'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { session } = auth
  const body = await req.json() as { currentPassword?: string; newPassword?: string }
  const { currentPassword = '', newPassword = '' } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Senha atual e nova senha são obrigatórias' }, { status: 400 })
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Nova senha deve ter pelo menos 6 caracteres' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const valid = await userService.verifyPassword(user.passwordHash, currentPassword)
  if (!valid) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 401 })

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: session.userId }, data: { passwordHash } })

  return NextResponse.json({ ok: true })
}
