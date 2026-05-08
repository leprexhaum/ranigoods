import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  const { session } = auth

  const body = await req.json() as { pixelConfigId?: string }
  if (!body.pixelConfigId) {
    return NextResponse.json({ error: 'pixelConfigId é obrigatório' }, { status: 400 })
  }

  const config = await prisma.pixelConfig.findUnique({ where: { id: body.pixelConfigId } })
  if (!config || config.userId !== session.userId) {
    return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  }
  if (config.platform !== 'google_ads') {
    return NextResponse.json({ error: 'Não é uma configuração Google Ads' }, { status: 400 })
  }

  await prisma.pixelConfig.update({
    where: { id: body.pixelConfigId },
    data:  { refreshToken: '', customerId: '', conversionActionId: '' },
  })

  return NextResponse.json({ ok: true })
}
