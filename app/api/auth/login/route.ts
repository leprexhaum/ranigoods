import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/services/user.service'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { username?: string; password?: string }
    const { username = '', password = '' } = body

    if (!username.trim() || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 })
    }

    const user = await userService.findByUsername(username)

    if (!user) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
    }

    const valid = await userService.verifyPassword(user.passwordHash, password)

    if (!valid) {
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
    }

    await createSession({ userId: user.id, username: user.username, email: user.email })

    return NextResponse.json({
      user: { id: user.id, username: user.username, email: user.email },
    })
  } catch (err) {
    console.error('[login]', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
