import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuth } from '@/lib/api-auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100)
    const list = await stripe.balanceTransactions.list({ limit, expand: ['data.source'] })
    return NextResponse.json(list.data.map(bt => ({
      id:          bt.id,
      type:        bt.type,
      amount:      bt.amount,
      fee:         bt.fee,
      net:         bt.net,
      currency:    bt.currency.toUpperCase(),
      status:      bt.status,
      description: bt.description ?? '',
      createdAt:   new Date(bt.created * 1000).toISOString(),
    })))
  } catch (err) {
    console.error('[stripe/transactions]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
