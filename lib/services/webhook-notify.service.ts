import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'

export const webhookNotifyService = {
  async notifyWebhooks(
    event:   string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const webhooks = await prisma.outboundWebhook.findMany({
      where: { enabled: true },
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

    const body      = JSON.stringify({ event, payload, timestamp: new Date().toISOString() })
    const bodyBuf   = Buffer.from(body)

    await Promise.allSettled(
      matching.map(async wh => {
        const sig = createHmac('sha256', wh.secret).update(bodyBuf).digest('hex')
        try {
          await fetch(wh.url, {
            method:  'POST',
            headers: {
              'Content-Type':        'application/json',
              'X-Webhook-Signature': `sha256=${sig}`,
              'X-Webhook-Event':     event,
            },
            body,
          })
        } catch (err) {
          console.error(`[webhook-notify] failed for ${wh.url}:`, err)
        }
      }),
    )
  },
}
