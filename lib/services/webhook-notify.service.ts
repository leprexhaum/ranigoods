import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const webhookNotifyService = {
  async notifyWebhooks(
    event:   string,
    payload: Record<string, unknown>,
    userId?: string,
  ): Promise<void> {
    const webhooks = await prisma.outboundWebhook.findMany({
      where: { enabled: true, ...(userId ? { userId } : {}) },
    })

    const matching = webhooks.filter(wh => {
      const events     = wh.events     as string[]
      const productIds = wh.productIds as string[]

      if (!events.includes(event)) return false

      if (productIds.length === 0) return true

      const pid = payload.productId as string | undefined
      return pid ? productIds.includes(pid) : false
    })

    if (matching.length === 0) return

    logger.info('WEBHOOK-OUT', 'Despacho iniciado', { event, destinos: matching.length })

    const body      = JSON.stringify({ event, payload, timestamp: new Date().toISOString() })
    const bodyBuf   = Buffer.from(body)

    await Promise.allSettled(
      matching.map(async wh => {
        const sig = createHmac('sha256', wh.secret).update(bodyBuf).digest('hex')
        const start = Date.now()
        try {
          const res = await fetch(wh.url, {
            method:  'POST',
            headers: {
              'Content-Type':        'application/json',
              'X-Webhook-Signature': `sha256=${sig}`,
              'X-Webhook-Event':     event,
            },
            body,
          })
          logger.info('WEBHOOK-OUT', 'Entrega concluída', { event, url: wh.url, status: res.status, duracao: `${Date.now() - start}ms` })
        } catch (err) {
          logger.error('WEBHOOK-OUT', 'Entrega falhada', { event, url: wh.url, error: err instanceof Error ? err.message : String(err) })
        }
      }),
    )
  },
}
