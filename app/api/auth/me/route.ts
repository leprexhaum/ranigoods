import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { userService } from '@/lib/services/user.service'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null }, { status: 401 })

  const user = await userService.findById(session.userId)
  if (!user) return NextResponse.json({ user: null }, { status: 401 })

  return NextResponse.json({ user })
}
