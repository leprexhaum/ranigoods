import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  try {
    const [coupons, promoCodes] = await Promise.all([
      stripe.coupons.list({ limit: 50 }),
      stripe.promotionCodes.list({ limit: 50 }),
    ])
    for (const c of coupons.data) {
      await prisma.stripeCoupon.upsert({
        where:  { id: c.id },
        create: {
          id:             c.id,
          name:           c.name ?? c.id,
          amountOff:      c.amount_off ?? null,
          percentOff:     c.percent_off ?? null,
          currency:       c.currency?.toUpperCase() ?? '',
          duration:       c.duration,
          durationMonths: c.duration_in_months ?? null,
          maxRedemptions: c.max_redemptions ?? null,
          timesRedeemed:  c.times_redeemed,
          valid:          c.valid,
        },
        update: { timesRedeemed: c.times_redeemed, valid: c.valid },
      })
    }
    for (const p of promoCodes.data) {
      await prisma.stripePromoCode.upsert({
        where:  { id: p.id },
        create: {
          id:             p.id,
          couponId:       typeof p.coupon === 'string' ? p.coupon : p.coupon.id,
          code:           p.code,
          active:         p.active,
          timesRedeemed:  p.times_redeemed,
          maxRedemptions: p.max_redemptions ?? null,
          expiresAt:      p.expires_at ? new Date(p.expires_at * 1000) : null,
        },
        update: { active: p.active, timesRedeemed: p.times_redeemed },
      })
    }
    const [dbCoupons, dbPromos] = await Promise.all([
      prisma.stripeCoupon.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.stripePromoCode.findMany({ orderBy: { createdAt: 'desc' } }),
    ])
    return NextResponse.json({ coupons: dbCoupons, promoCodes: dbPromos })
  } catch (err) {
    logger.error('STRIPE-API', 'Erro ao listar coupons', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  try {
    const body = await req.json()
    const coupon = await stripe.coupons.create({
      name:            body.name,
      ...(body.type === 'percent'
        ? { percent_off: body.value }
        : { amount_off: body.value, currency: body.currency ?? 'eur' }),
      duration:        body.duration ?? 'once',
      max_redemptions: body.maxRedemptions ?? undefined,
    })
    await prisma.stripeCoupon.create({
      data: {
        id:             coupon.id,
        name:           coupon.name ?? coupon.id,
        amountOff:      coupon.amount_off ?? null,
        percentOff:     coupon.percent_off ?? null,
        currency:       coupon.currency?.toUpperCase() ?? '',
        duration:       coupon.duration,
        durationMonths: coupon.duration_in_months ?? null,
        maxRedemptions: coupon.max_redemptions ?? null,
        timesRedeemed:  0,
        valid:          true,
      },
    })
    // Criar promo code se fornecido
    if (body.code) {
      const promo = await stripe.promotionCodes.create({ coupon: coupon.id, code: body.code })
      await prisma.stripePromoCode.create({
        data: {
          id:             promo.id,
          couponId:       coupon.id,
          code:           promo.code,
          active:         true,
          timesRedeemed:  0,
          maxRedemptions: promo.max_redemptions ?? null,
          expiresAt:      promo.expires_at ? new Date(promo.expires_at * 1000) : null,
        },
      })
    }
    return NextResponse.json(coupon, { status: 201 })
  } catch (err) {
    logger.error('STRIPE-API', 'Erro ao criar coupon', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro ao criar cupão' }, { status: 500 })
  }
}
