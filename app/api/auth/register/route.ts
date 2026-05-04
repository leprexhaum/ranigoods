import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/services/user.service'
import { createSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { username?: string; email?: string; password?: string }
    const { username = '', email = '', password = '' } = body

    if (!username.trim() || !email.trim() || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    if (username.trim().length < 3) {
      return NextResponse.json({ error: 'Usuário deve ter pelo menos 3 caracteres' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return NextResponse.json({ error: 'Usuário só pode conter letras, números e _' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    const [usernameExists, emailExists] = await Promise.all([
      userService.existsByUsername(username),
      userService.existsByEmail(email),
    ])

    if (usernameExists) {
      return NextResponse.json({ error: 'Este nome de usuário já está em uso' }, { status: 409 })
    }

    if (emailExists) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })
    }

    const user = await userService.create(username, email, password)

    await createSession({ userId: user.id, username: user.username, email: user.email })

    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
