import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
export const dynamic = 'force-dynamic'

export async function POST() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const results: Record<string, number> = { payouts: 0, charges: 0, disputes: 0, refunds: 0, customers: 0, transactions: 0, payments_created: 0, payments_updated: 0 }

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

    // ── PaymentIntents → Payment + DailySale (recupera pagamentos em falta) ──
    hasMore = true; startingAfter = undefined
    const piResults = { created: 0, updated: 0 }
    while (hasMore) {
      const piParams: Stripe.PaymentIntentListParams = { limit: 100 }
      if (startingAfter) piParams.starting_after = startingAfter
      const list = await stripe.paymentIntents.list(piParams)
      for (const pi of list.data) {
        if (pi.status !== 'succeeded') continue
        const charge = pi.latest_charge
          ? (typeof pi.latest_charge === 'string'
              ? await stripe.charges.retrieve(pi.latest_charge).catch(() => null)
              : pi.latest_charge)
          : null
        const customer  = (charge as Stripe.Charge | null)?.billing_details?.name  ?? pi.metadata?.customerName  ?? 'Cliente'
        const email     = (charge as Stripe.Charge | null)?.billing_details?.email ?? pi.metadata?.customerEmail ?? ''
        const typeRaw   = (charge as Stripe.Charge | null)?.payment_method_details?.type ?? ''
        const methodMap: Record<string, string> = { card: 'Cartão', mb_way: 'MB WAY', multibanco: 'Multibanco', sepa_debit: 'SEPA', paypal: 'PayPal', pix: 'Pix', boleto: 'Boleto' }
        const method    = methodMap[typeRaw] ?? 'Cartão'
        const stripeDate = new Date(pi.created * 1000)
        const isoDate   = stripeDate.toISOString().slice(0, 10)
        const dateLabel = stripeDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

        // Tentar obter nome real do produto via checkout_payment
        const cpName = await prisma.checkoutPayment.findFirst({
          where:  { stripePaymentIntentId: pi.id },
          select: { product: { select: { name: true } } },
        }).catch(() => null)
        const product = cpName?.product?.name ?? pi.metadata?.productName ?? pi.description ?? 'Produto'

        const existing = await prisma.payment.findUnique({ where: { id: pi.id } })
        await prisma.payment.upsert({
          where:  { id: pi.id },
          create: { id: pi.id, customer, email, amount: pi.amount, status: 'succeeded', date: isoDate, createdAt: stripeDate, product, method },
          update: { status: 'succeeded', method, product, createdAt: stripeDate },
        }).catch(() => {})

        if (!existing) {
          await prisma.dailySale.upsert({
            where:  { isoDate },
            create: { date: dateLabel, isoDate, receita: pi.amount, vendas: 1, falhas: 0 },
            update: { receita: { increment: pi.amount }, vendas: { increment: 1 } },
          }).catch(() => {})
          piResults.created++
        } else {
          piResults.updated++
        }
      }
      hasMore = list.has_more
      if (list.data.length) startingAfter = list.data[list.data.length - 1].id
    }
    results.payments_created = piResults.created
    results.payments_updated = piResults.updated

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
    logger.error('STRIPE-API', 'Erro no backfill', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno', partial: results }, { status: 500 })
  }
}

// GET — corrige createdAt e nomes dos payments existentes usando dados reais do Stripe
export async function GET() {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  let fixed = 0; let errors = 0
  try {
    // Buscar todos os payments que têm id começando por pi_ (PaymentIntents)
    const payments = await prisma.payment.findMany({
      where: { id: { startsWith: 'pi_' } },
      select: { id: true, createdAt: true, product: true },
    })

    for (const p of payments) {
      try {
        const pi = await stripe.paymentIntents.retrieve(p.id)
        const stripeDate = new Date(pi.created * 1000)

        // Obter nome real do produto
        const cpName = await prisma.checkoutPayment.findFirst({
          where:  { stripePaymentIntentId: p.id },
          select: { product: { select: { name: true } } },
        }).catch(() => null)
        const productName = cpName?.product?.name ?? pi.metadata?.productName ?? pi.description ?? p.product

        await prisma.payment.update({
          where: { id: p.id },
          data:  { createdAt: stripeDate, product: productName },
        })
        fixed++
      } catch {
        errors++
      }
    }

    return NextResponse.json({ success: true, fixed, errors, total: payments.length })
  } catch (err) {
    logger.error('STRIPE-API', 'Erro no backfill GET', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
