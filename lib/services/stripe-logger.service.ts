import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

function safeJson(obj: unknown): object {
  try {
    return JSON.parse(JSON.stringify(obj)) as object
  } catch {
    return {}
  }
}

export const stripeLogger = {
  async logEvent(event: Stripe.Event): Promise<void> {
    try {
      const obj = event.data.object as { id?: string; object?: string }
      await prisma.stripeEvent.upsert({
        where: { id: event.id },
        create: {
          id:         event.id,
          type:       event.type,
          livemode:   event.livemode,
          apiVersion: event.api_version ?? '',
          objectId:   obj?.id ?? '',
          objectType: obj?.object ?? '',
          payload:    safeJson(event.data.object),
          processed:  false,
        },
        update: {},
      })
    } catch (err) {
      console.error('[stripe-logger] logEvent failed:', err)
    }
  },

  async markEventProcessed(eventId: string): Promise<void> {
    try {
      await prisma.stripeEvent.update({
        where: { id: eventId },
        data:  { processed: true, error: null },
      })
    } catch (err) {
      console.error('[stripe-logger] markEventProcessed failed:', err)
    }
  },

  async markEventFailed(eventId: string, error: string): Promise<void> {
    try {
      await prisma.stripeEvent.update({
        where: { id: eventId },
        data:  { processed: false, error: error.slice(0, 1000) },
      })
    } catch (err) {
      console.error('[stripe-logger] markEventFailed failed:', err)
    }
  },

  async logApiCall<T>(
    operation: string,
    objectId:  string,
    request:   object,
    fn:        () => Promise<T>,
  ): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const durationMs = Date.now() - start
      prisma.stripeApiLog.create({
        data: {
          operation,
          objectId,
          request:   safeJson(request),
          response:  safeJson(result),
          success:   true,
          durationMs,
        },
      }).catch(e => console.error('[stripe-logger] logApiCall write failed:', e))
      return result
    } catch (err) {
      const durationMs = Date.now() - start
      const stripeErr = err as Stripe.errors.StripeError
      prisma.stripeApiLog.create({
        data: {
          operation,
          objectId,
          request:   safeJson(request),
          response:  {},
          success:   false,
          errorCode: stripeErr.code ?? stripeErr.type ?? 'unknown',
          errorMsg:  stripeErr.message?.slice(0, 500),
          durationMs,
        },
      }).catch(e => console.error('[stripe-logger] logApiCall error write failed:', e))
      throw err
    }
  },
}
