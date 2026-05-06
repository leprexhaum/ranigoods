import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const results: Record<string, number> = { payouts: 0, charges: 0, disputes: 0, refunds: 0, customers: 0, transactions: 0 }

  try {
    // ── Payouts ──────────────────────────────────────────────────────────────
    let hasMore = true; let startingAfter: string | undefined
    while (hasMore) {
      const list = await stripe.payouts.list({ limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) })
      for (const p of list.data) {
        await prisma.payout.upsert({
          where:  { id: p.id },
          create: { id: p.id, amount: p.amount, currency: p.currency.toUpperCase(), status: p.status, arrivalDate: new Date(p.arrival_date * 1000), description: p.description ?? '' },
          update: { status: p.status },
        }).catch(() => {})
        results.payouts++
      }
      hasMore = list.has_more
      if (list.data.length) startingAfter = list.data[list.data.length - 1].id
    }

    // ── Charges (card info + fees + refunds embutidos) ────────────────────────
    hasMore = true; startingAfter = undefined
    while (hasMore) {
      const chargeParams: Stripe.ChargeListParams = { limit: 100, expand: ['data.balance_transaction', 'data.refunds'] }
      if (startingAfter) chargeParams.starting_after = startingAfter
      const list: Stripe.ApiList<Stripe.Charge> = await stripe.charges.list(chargeParams)
      for (const charge of list.data) {
        const piId    = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id ?? ''
        const card    = charge.payment_method_details?.card
        const outcome = charge.outcome
        const bt      = charge.balance_transaction as Stripe.BalanceTransaction | null
        if (piId) {
          await prisma.checkoutPayment.updateMany({
            where: { stripePaymentIntentId: piId },
            data:  { cardLast4: card?.last4 ?? '', cardBrand: card?.brand ?? '', cardCountry: card?.country ?? '', riskLevel: outcome?.risk_level ?? '', fee: bt?.fee ?? 0, net: bt?.net ?? 0, balanceTxId: bt?.id ?? '' },
          }).catch(() => {})
        }
        // Extrair reembolsos embutidos no charge
        const refundList = charge.refunds as Stripe.ApiList<Stripe.Refund> | undefined
        for (const r of refundList?.data ?? []) {
          const rPiId = typeof r.payment_intent === 'string' ? r.payment_intent : r.payment_intent?.id ?? ''
          await prisma.stripeRefund.upsert({
            where:  { id: r.id },
            create: { id: r.id, chargeId: typeof r.charge === 'string' ? r.charge : r.charge?.id ?? '', paymentIntentId: rPiId, amount: r.amount, currency: r.currency.toUpperCase(), status: r.status ?? '', reason: r.reason ?? '' },
            update: { status: r.status ?? '' },
          }).catch(() => {})
          results.refunds++
        }
        results.charges++
      }
      hasMore = list.has_more
      if (list.data.length) startingAfter = list.data[list.data.length - 1].id
    }

    // ── Disputes ──────────────────────────────────────────────────────────────
    hasMore = true; startingAfter = undefined
    while (hasMore) {
      const disputeParams: Stripe.DisputeListParams = { limit: 100 }
      if (startingAfter) disputeParams.starting_after = startingAfter
      const list: Stripe.ApiList<Stripe.Dispute> = await stripe.disputes.list(disputeParams)
      for (const d of list.data) {
        const piId = typeof d.payment_intent === 'string' ? d.payment_intent : d.payment_intent?.id ?? ''
        await prisma.stripeDispute.upsert({
          where:  { id: d.id },
          create: { id: d.id, chargeId: typeof d.charge === 'string' ? d.charge : d.charge?.id ?? '', paymentIntentId: piId, amount: d.amount, currency: d.currency.toUpperCase(), status: d.status, reason: d.reason, evidenceDueBy: d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000) : null },
          update: { status: d.status },
        }).catch(() => {})
        results.disputes++
      }
      hasMore = list.has_more
      if (list.data.length) startingAfter = list.data[list.data.length - 1].id
    }

    // ── Customers ─────────────────────────────────────────────────────────────
    hasMore = true; startingAfter = undefined
    while (hasMore) {
      const custParams: Stripe.CustomerListParams = { limit: 100 }
      if (startingAfter) custParams.starting_after = startingAfter
      const list: Stripe.ApiList<Stripe.Customer | Stripe.DeletedCustomer> = await stripe.customers.list(custParams)
      for (const c of list.data) {
        if (c.deleted) continue
        await prisma.stripeCustomer.upsert({
          where:  { stripeCustomerId: c.id },
          create: { id: c.id, stripeCustomerId: c.id, name: c.name ?? '', email: c.email ?? '', phone: c.phone ?? '' },
          update: { name: c.name ?? '', email: c.email ?? '', phone: c.phone ?? '' },
        }).catch(() => {})
        results.customers++
      }
      hasMore = list.has_more
      if (list.data.length) startingAfter = list.data[list.data.length - 1].id
    }

    // ── Balance Transactions ──────────────────────────────────────────────────
    hasMore = true; startingAfter = undefined
    while (hasMore) {
      const btParams: Stripe.BalanceTransactionListParams = { limit: 100 }
      if (startingAfter) btParams.starting_after = startingAfter
      const list = await stripe.balanceTransactions.list(btParams)
      for (const bt of list.data) {
        await prisma.stripeBalanceTransaction.upsert({
          where:  { id: bt.id },
          create: { id: bt.id, type: bt.type, amount: bt.amount, fee: bt.fee, net: bt.net, currency: bt.currency.toUpperCase(), status: bt.status, description: bt.description ?? '', createdAt: new Date(bt.created * 1000) },
          update: { status: bt.status },
        }).catch(() => {})
        results.transactions++
      }
      hasMore = list.has_more
      if (list.data.length) startingAfter = list.data[list.data.length - 1].id
    }

    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    console.error('[stripe/backfill]', err)
    return NextResponse.json({ error: 'Erro interno', partial: results }, { status: 500 })
  }
}
