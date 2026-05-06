import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const warnings = await prisma.fraudWarning.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(warnings)
  } catch (err) {
    console.error('[fraud]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
