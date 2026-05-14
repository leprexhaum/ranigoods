import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { checkoutConfigService } from '@/lib/services/checkout-config.service'
import { CHECKOUT_PRESETS, DEFAULT_CHECKOUT_COLORS } from '@/lib/types/checkout'
import type { CheckoutColors } from '@/lib/types/checkout'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const globalColors = await checkoutConfigService.getGlobal()

  return NextResponse.json({
    colors: { ...DEFAULT_CHECKOUT_COLORS, ...globalColors },
    presets: CHECKOUT_PRESETS,
    defaults: DEFAULT_CHECKOUT_COLORS,
  })
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as { colors?: Partial<CheckoutColors>; productId?: string }
  if (!body.colors || typeof body.colors !== 'object') {
    return NextResponse.json({ error: 'colors é obrigatório' }, { status: 400 })
  }

  // Validar que só contém chaves válidas
  const validKeys = ['panelBg', 'formBg', 'accent', 'buttonBg', 'buttonText']
  const filtered: Partial<CheckoutColors> = {}
  for (const [key, value] of Object.entries(body.colors)) {
    if (validKeys.includes(key) && typeof value === 'string') {
      (filtered as Record<string, string>)[key] = value
    }
  }

  try {
    if (body.productId) {
      await checkoutConfigService.setForProduct(body.productId, filtered)
    } else {
      await checkoutConfigService.setGlobal(filtered)
    }

    logger.info('CHECKOUT', 'Cores salvas', { username: auth.session.username, scope: body.productId ?? 'global' })
    return NextResponse.json({ ok: true, colors: filtered })
  } catch (err) {
    logger.error('CHECKOUT', 'Erro ao salvar cores', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}
