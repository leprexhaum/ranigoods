import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// Rota one-shot: atribui userId do utilizador logado a todos os produtos sem userId
export async function POST() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { userId } = auth.session

  const result = await prisma.product.updateMany({
    where: { userId: '' },
    data:  { userId },
  })

  return NextResponse.json({ updated: result.count, userId })
}
