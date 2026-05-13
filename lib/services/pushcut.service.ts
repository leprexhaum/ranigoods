import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export type PushcutEvent = 'payment.succeeded' | 'payment.failed' | 'payment.refunded'

export const pushcutService = {
  async notify(event: PushcutEvent, payload: {
    title:   string
    message: string
    userId?: string
  }): Promise<void> {
    const configs = await prisma.pushcutConfig.findMany({
      where: {
        enabled: true,
        ...(payload.userId ? { userId: payload.userId } : {}),
      },
    })

    const matching = configs.filter(c => (c.events as string[]).includes(event))
    if (matching.length === 0) return

    await Promise.allSettled(
      matching.map(async cfg => {
        const start = Date.now()
        try {
          await fetch(cfg.webhookUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ title: payload.title, text: payload.message }),
          })
          logger.info('PUSHCUT', 'Notificação enviada', { event, webhookUrl: cfg.webhookUrl, duracao: `${Date.now() - start}ms` })
        } catch (err) {
          logger.error('PUSHCUT', 'Notificação falhada', { event, webhookUrl: cfg.webhookUrl, error: err instanceof Error ? err.message : String(err) })
        }
      }),
    )
  },
}
