import { NextRequest, NextResponse } from 'next/server'
import { userService } from '@/lib/services/user.service'
import { createSession } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown'
  try {
    const body = await req.json() as { username?: string; password?: string }
    const { username = '', password = '' } = body

    if (!username.trim() || !password) {
      return NextResponse.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 })
    }

    logger.info('AUTH', 'Tentativa de login', { username, ip })

    const user = await userService.findByUsername(username)

    if (!user) {
      logger.warn('AUTH', 'Login falhado — utilizador inexistente', { username, ip })
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
    }

    const valid = await userService.verifyPassword(user.passwordHash, password)

    if (!valid) {
      logger.warn('AUTH', 'Login falhado — senha incorreta', { username, ip })
      return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })
    }

    await createSession({ userId: user.id, username: user.username, email: user.email })

    logger.info('AUTH', 'Login efetuado com sucesso', { userId: user.id, username: user.username, ip })

    return NextResponse.json({
      user: { id: user.id, username: user.username, email: user.email },
    })
  } catch (err) {
    logger.error('AUTH', 'Erro interno no login', { error: err instanceof Error ? err.message : String(err), ip })
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
