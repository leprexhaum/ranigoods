import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { pushcutService } from '@/lib/services/pushcut.service'
import { utmifyService } from '@/lib/services/utmify.service'
import { webhookNotifyService } from '@/lib/services/webhook-notify.service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { type, payload } = body as { type: string; payload: Record<string, unknown> }
  logger.info('WEBHOOK-OUT', 'Teste de integração', { username: auth.session.username, type })

  const startTime = Date.now()

  try {
    switch (type) {
      case 'pushcut': {
        const event = (payload.event as string) || 'payment.succeeded'
        const title = (payload.title as string) || '🧪 Teste Pushcut'
        const message = (payload.message as string) || 'Notificação de teste — TechPags Dev'
        const userId = payload.userId as string | undefined
        const customUrl = payload.customUrl as string | undefined

        // Se URL customizado, enviar direto
        if (customUrl) {
          const res = await fetch(customUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, text: message }),
          })
          return NextResponse.json({
            success: res.ok,
            duration: Date.now() - startTime,
            details: {
              mode: 'custom_url',
              url: customUrl,
              statusCode: res.status,
              payload: { title, text: message },
            },
          })
        }

        // Buscar configs que vão receber
        const configs = await prisma.pushcutConfig.findMany({
          where: { enabled: true, ...(userId ? { userId } : {}) },
        })
        const matching = configs.filter(c => (c.events as string[]).includes(event))

        if (matching.length === 0) {
          return NextResponse.json({
            success: false,
            duration: Date.now() - startTime,
            error: `Nenhuma config Pushcut encontrada para o evento "${event}"`,
            details: { configsTotal: configs.length, event },
          })
        }

        await pushcutService.notify(event as 'payment.succeeded', { title, message, userId })

        return NextResponse.json({
          success: true,
          duration: Date.now() - startTime,
          details: {
            mode: 'saved_configs',
            event,
            configsMatched: matching.length,
            urls: matching.map(c => c.webhookUrl),
            payload: { title, text: message },
          },
        })
      }

      case 'utmify': {
        const configId = payload.configId as string | undefined
        const customApiToken = payload.customApiToken as string | undefined

        let apiToken = ''
        let configName = 'Token customizado'

        if (customApiToken) {
          apiToken = customApiToken
        } else if (configId) {
          const utmCfg = await prisma.utmifyConfig.findUnique({ where: { id: configId } })
          if (!utmCfg) {
            return NextResponse.json({ success: false, duration: Date.now() - startTime, error: 'Config UTMify não encontrada' })
          }
          apiToken = utmCfg.apiToken
          configName = utmCfg.name || 'Sem nome'
        } else {
          return NextResponse.json({ success: false, duration: Date.now() - startTime, error: 'Selecione uma config ou insira um API token' })
        }

        const orderId = `test_${Date.now()}`
        const orderInput = {
          orderId,
          stripeMethod: (payload.method as string) || 'card',
          currency: (payload.currency as string) || 'eur',
          createdAt: new Date(),
          approvedAt: new Date(),
          customer: {
            name: (payload.customerName as string) || 'Cliente Teste',
            email: (payload.customerEmail as string) || 'teste@techpags.com',
            phone: (payload.customerPhone as string) || '912345678',
            document: '',
            ip: '127.0.0.1',
          },
          products: [{
            id: (payload.productId as string) || 'prod_test',
            name: (payload.productName as string) || 'Produto Teste',
            quantity: 1,
            priceInCents: Number(payload.amount) || 1000,
          }],
          trackingParameters: {
            src: 'dev_test',
            utm_source: 'techpags_dev',
          },
          totalPriceInCents: Number(payload.amount) || 1000,
          gatewayFeeInCents: 0,
        }

        await utmifyService.sendOrder(apiToken, orderInput)

        return NextResponse.json({
          success: true,
          duration: Date.now() - startTime,
          details: {
            configName,
            orderId,
            endpoint: 'https://api.utmify.com.br/api-credentials/orders',
            payload: orderInput,
          },
        })
      }

      case 'outbound_webhook': {
        const event = (payload.event as string) || 'payment.succeeded'
        const userId = payload.userId as string | undefined
        const customUrl = payload.customUrl as string | undefined
        const customSecret = payload.customSecret as string | undefined
        const testPayload = {
          productId: (payload.productId as string) || 'prod_test',
          productName: (payload.productName as string) || 'Produto Teste',
          customerName: (payload.customerName as string) || 'Cliente Teste',
          customerEmail: (payload.customerEmail as string) || 'teste@techpags.com',
          amount: Number(payload.amount) || 1000,
          currency: (payload.currency as string) || 'EUR',
          status: 'paid',
          isTest: true,
          timestamp: new Date().toISOString(),
        }

        // Se URL customizado, enviar direto
        if (customUrl) {
          const { createHmac } = await import('crypto')
          const bodyStr = JSON.stringify({ event, payload: testPayload, timestamp: new Date().toISOString() })
          const sig = customSecret
            ? createHmac('sha256', customSecret).update(Buffer.from(bodyStr)).digest('hex')
            : 'no_secret'
          const res = await fetch(customUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': `sha256=${sig}`,
              'X-Webhook-Event': event,
            },
            body: bodyStr,
          })
          const responseText = await res.text().catch(() => '')
          return NextResponse.json({
            success: res.ok,
            duration: Date.now() - startTime,
            details: {
              mode: 'custom_url',
              url: customUrl,
              statusCode: res.status,
              response: responseText.slice(0, 2000),
              payload: testPayload,
            },
          })
        }

        // Buscar webhooks que vão receber
        const webhooks = await prisma.outboundWebhook.findMany({
          where: { enabled: true, ...(userId ? { userId } : {}) },
        })
        const matching = webhooks.filter(wh => {
          const events = wh.events as string[]
          return events.includes(event)
        })

        if (matching.length === 0) {
          return NextResponse.json({
            success: false,
            duration: Date.now() - startTime,
            error: `Nenhum webhook encontrado para o evento "${event}"`,
            details: { webhooksTotal: webhooks.length, event },
          })
        }

        await webhookNotifyService.notifyWebhooks(event, testPayload, userId)

        return NextResponse.json({
          success: true,
          duration: Date.now() - startTime,
          details: {
            mode: 'saved_configs',
            event,
            webhooksMatched: matching.length,
            urls: matching.map(w => w.url),
            payload: testPayload,
          },
        })
      }

      case 'stripe_webhook': {
        const event = (payload.event as string) || 'payment_intent.succeeded'
        const testPayload = {
          id: `evt_test_${Date.now()}`,
          object: 'event',
          type: event,
          livemode: false,
          created: Math.floor(Date.now() / 1000),
          data: {
            object: {
              id: `pi_test_${Date.now()}`,
              object: 'payment_intent',
              amount: Number(payload.amount) || 1000,
              currency: (payload.currency as string) || 'eur',
              status: 'succeeded',
              metadata: {
                productId: (payload.productId as string) || 'prod_test',
                productName: (payload.productName as string) || 'Produto Teste',
                customerName: (payload.customerName as string) || 'Cliente Teste',
                customerEmail: (payload.customerEmail as string) || 'teste@techpags.com',
              },
            },
          },
        }

        // Simular chamada ao próprio webhook endpoint
        const baseUrl = req.nextUrl.origin
        const res = await fetch(`${baseUrl}/api/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test_mode_bypass',
          },
          body: JSON.stringify(testPayload),
        })

        const responseText = await res.text()

        return NextResponse.json({
          success: res.ok,
          duration: Date.now() - startTime,
          details: {
            event,
            statusCode: res.status,
            response: responseText.slice(0, 2000),
            payload: testPayload,
          },
        })
      }

      default:
        return NextResponse.json({ success: false, error: `Tipo desconhecido: ${type}` }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      duration: Date.now() - startTime,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : undefined,
    }, { status: 500 })
  }
}
