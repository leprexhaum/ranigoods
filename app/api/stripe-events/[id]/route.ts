import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const ev = await prisma.stripeEvent.findUnique({ where: { id: params.id } })
  if (!ev) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(ev)
}
