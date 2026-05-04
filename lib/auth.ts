import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE  = 'rg_session'
const EXPIRES = 7 * 24 * 60 * 60 // 7 dias em segundos

export interface SessionPayload {
  userId:   string
  username: string
  email:    string
}

function getKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET não configurado')
  return new TextEncoder().encode(secret)
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES}s`)
    .sign(getKey())
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getKey())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload)
  ;(await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   EXPIRES,
    path:     '/',
  })
}

export async function destroySession(): Promise<void> {
  ;(await cookies()).delete(COOKIE)
}
