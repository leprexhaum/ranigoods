import { NextResponse } from 'next/server'
import { domainService } from '@/lib/services/domain.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await domainService.checkPropagation()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
