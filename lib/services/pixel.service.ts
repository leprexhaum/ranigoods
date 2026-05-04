import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import type {
  PixelConfig, PixelFireLog, TrackEventPayload, PixelEventConfig,
} from '@/lib/types/pixel'

// ─── DB helpers ─────────────────────────────────────────────────────────────

function rowToConfig(r: {
  id: string; platform: string; name: string; pixelId: string; accessToken: string;
  testEventCode: string; conversionLabel: string; enabled: boolean; events: unknown;
  createdAt: Date; updatedAt: Date;
}): PixelConfig {
  return {
    id:              r.id,
    platform:        r.platform as PixelConfig['platform'],
    name:            r.name,
    pixelId:         r.pixelId,
    accessToken:     r.accessToken,
    testEventCode:   r.testEventCode,
    conversionLabel: r.conversionLabel,
    enabled:         r.enabled,
    events:          r.events as PixelEventConfig[],
    createdAt:       r.createdAt.toISOString(),
    updatedAt:       r.updatedAt.toISOString(),
  }
}

function rowToLog(r: {
  id: string; configId: string; platform: string; event: string; success: boolean;
  message: string; timestamp: Date; data: unknown; isTest: boolean;
}): PixelFireLog {
  return {
    id:        r.id,
    configId:  r.configId,
    platform:  r.platform as PixelFireLog['platform'],
    event:     r.event,
    success:   r.success,
    message:   r.message,
    timestamp: r.timestamp.toISOString(),
    data:      r.data as Record<string, unknown> | undefined,
    isTest:    r.isTest,
  }
}

function newLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

// ─── Meta Conversions API ───────────────────────────────────────────────────

async function fireMetaCAPI(
  config: PixelConfig,
  eventName: string,
  payload: TrackEventPayload,
  isTest = false,
): Promise<{ success: boolean; message: string }> {
  if (!config.pixelId || !config.accessToken) {
    return { success: false, message: 'Pixel ID ou Access Token não configurado' }
  }

  const userData: Record<string, string | undefined> = {}
  if (payload.userData?.email)     userData.em  = sha256(payload.userData.email)
  if (payload.userData?.phone)     userData.ph  = sha256(payload.userData.phone)
  if (payload.userData?.firstName) userData.fn  = sha256(payload.userData.firstName)
  if (payload.userData?.lastName)  userData.ln  = sha256(payload.userData.lastName)
  if (payload.userData?.ip)        userData.client_ip_address = payload.userData.ip
  if (payload.userData?.userAgent) userData.client_user_agent = payload.userData.userAgent
  if (payload.userData?.fbp)       userData.fbp = payload.userData.fbp
  if (payload.userData?.fbc)       userData.fbc = payload.userData.fbc

  const body: Record<string, unknown> = {
    data: [{
      event_name:    eventName,
      event_time:    Math.floor(Date.now() / 1000),
      event_id:      `evt_${Date.now()}`,
      action_source: 'website',
      user_data:     userData,
      custom_data:   payload.data ? {
        value:        payload.data.value    ? payload.data.value / 100 : undefined,
        currency:     payload.data.currency || 'BRL',
        content_ids:  payload.data.content_ids,
        content_type: payload.data.content_type,
        num_items:    payload.data.num_items,
        order_id:     payload.data.order_id,
      } : undefined,
    }],
  }
  if (isTest && config.testEventCode) body.test_event_code = config.testEventCode

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${config.pixelId}/events?access_token=${config.accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    const json = await res.json() as { events_received?: number; error?: { message: string } }
    if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`)
    return { success: true, message: `Meta CAPI: ${json.events_received ?? 1} evento(s) recebido(s)` }
  } catch (err) {
    return { success: false, message: `Meta CAPI: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ─── GA4 Measurement Protocol ───────────────────────────────────────────────

async function fireGA4MP(
  config: PixelConfig,
  eventName: string,
  payload: TrackEventPayload,
): Promise<{ success: boolean; message: string }> {
  if (!config.pixelId || !config.accessToken) {
    return { success: false, message: 'Measurement ID ou API Secret não configurado' }
  }

  const ga4EventMap: Record<string, string> = {
    Purchase:             'purchase',
    InitiateCheckout:     'begin_checkout',
    AddToCart:            'add_to_cart',
    ViewContent:          'view_item',
    Lead:                 'generate_lead',
    CompleteRegistration: 'sign_up',
    PageView:             'page_view',
    AddPaymentInfo:       'add_payment_info',
    Subscribe:            'subscribe',
    StartTrial:           'start_trial',
    Search:               'search',
  }

  const body = {
    client_id: payload.userData?.ip ?? `ranigoods_${Date.now()}`,
    events: [{
      name:   ga4EventMap[eventName] ?? eventName.toLowerCase(),
      params: {
        currency:             payload.data?.currency ?? 'BRL',
        value:                payload.data?.value ? payload.data.value / 100 : undefined,
        transaction_id:       payload.data?.order_id,
        engagement_time_msec: 100,
      },
    }],
  }

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${config.pixelId}&api_secret=${config.accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`)
    return { success: true, message: 'GA4 Measurement Protocol: evento enviado' }
  } catch (err) {
    return { success: false, message: `GA4 MP: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ─── TikTok Events API ───────────────────────────────────────────────────────

async function fireTikTokAPI(
  config: PixelConfig,
  eventName: string,
  payload: TrackEventPayload,
): Promise<{ success: boolean; message: string }> {
  if (!config.pixelId || !config.accessToken) {
    return { success: false, message: 'Pixel ID ou Access Token não configurado' }
  }

  const ttEventMap: Record<string, string> = {
    Purchase:             'CompletePayment',
    InitiateCheckout:     'InitiateCheckout',
    AddToCart:            'AddToCart',
    ViewContent:          'ViewContent',
    Lead:                 'SubmitForm',
    CompleteRegistration: 'CompleteRegistration',
    PageView:             'Pageview',
    Subscribe:            'Subscribe',
    AddPaymentInfo:       'AddPaymentInfo',
    Search:               'Search',
  }

  const body = {
    pixel_code: config.pixelId,
    event:      ttEventMap[eventName] ?? eventName,
    event_id:   `evt_${Date.now()}`,
    timestamp:  new Date().toISOString(),
    context: {
      user: {
        email:        payload.userData?.email ? sha256(payload.userData.email) : undefined,
        phone_number: payload.userData?.phone ? sha256(payload.userData.phone) : undefined,
      },
      ip:         payload.userData?.ip,
      user_agent: payload.userData?.userAgent,
    },
    properties: payload.data?.value ? {
      value:       payload.data.value / 100,
      currency:    payload.data.currency ?? 'BRL',
      content_ids: payload.data.content_ids,
      quantity:    payload.data.num_items,
      order_id:    payload.data.order_id,
    } : undefined,
  }

  try {
    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Token': config.accessToken },
      body: JSON.stringify(body),
    })
    const json = await res.json() as { code?: number; message?: string }
    if (!res.ok || json.code !== 0) throw new Error(json.message ?? `HTTP ${res.status}`)
    return { success: true, message: 'TikTok Events API: evento enviado' }
  } catch (err) {
    return { success: false, message: `TikTok API: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ─── Public service ──────────────────────────────────────────────────────────

export const pixelService = {
  async getAll(): Promise<PixelConfig[]> {
    const rows = await prisma.pixelConfig.findMany({ orderBy: { createdAt: 'asc' } })
    return rows.map(rowToConfig)
  },

  async getById(id: string): Promise<PixelConfig | null> {
    const r = await prisma.pixelConfig.findUnique({ where: { id } })
    return r ? rowToConfig(r) : null
  },

  async update(
    id: string,
    data: Partial<Omit<PixelConfig, 'id' | 'platform' | 'createdAt'>>,
  ): Promise<PixelConfig | null> {
    try {
      const { events, ...rest } = data
      const r = await prisma.pixelConfig.update({
        where: { id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data:  { ...rest, ...(events !== undefined ? { events: events as any } : {}), updatedAt: new Date() },
      })
      return rowToConfig(r)
    } catch {
      return null
    }
  },

  async getLogs(limit = 100): Promise<PixelFireLog[]> {
    const rows = await prisma.pixelLog.findMany({
      orderBy: { timestamp: 'desc' },
      take:    limit,
    })
    return rows.map(rowToLog)
  },

  async clearLogs(): Promise<void> {
    await prisma.pixelLog.deleteMany()
  },

  async addLog(entry: Omit<PixelFireLog, 'id' | 'timestamp'>): Promise<PixelFireLog> {
    const r = await prisma.pixelLog.create({
      data: {
        id:        newLogId(),
        configId:  entry.configId,
        platform:  entry.platform,
        event:     entry.event,
        success:   entry.success,
        message:   entry.message,
        timestamp: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data:      (entry.data ?? undefined) as any,
        isTest:    entry.isTest ?? false,
      },
    })
    return rowToLog(r)
  },

  async trackEvent(eventName: string, payload: TrackEventPayload): Promise<PixelFireLog[]> {
    const allConfigs = await prisma.pixelConfig.findMany({ where: { enabled: true } })
    const configs = allConfigs
      .map(rowToConfig)
      .filter(c => c.events.some(e => e.event === eventName && e.enabled))

    const results = await Promise.all(
      configs.map(async config => {
        let res: { success: boolean; message: string }

        switch (config.platform) {
          case 'meta':
            res = config.accessToken
              ? await fireMetaCAPI(config, eventName, payload)
              : { success: true, message: 'Meta Pixel: disparado via client-side' }
            break
          case 'ga4':
            res = config.accessToken
              ? await fireGA4MP(config, eventName, payload)
              : { success: true, message: 'GA4: disparado via client-side' }
            break
          case 'tiktok':
            res = config.accessToken
              ? await fireTikTokAPI(config, eventName, payload)
              : { success: true, message: 'TikTok Pixel: disparado via client-side' }
            break
          case 'google_ads':
            res = { success: true, message: 'Google Ads: disparado via gtag client-side' }
            break
          default:
            res = { success: true, message: 'Evento registrado' }
        }

        return this.addLog({
          configId: config.id,
          platform: config.platform,
          event:    eventName,
          success:  res.success,
          message:  res.message,
          data:     payload.data,
        })
      }),
    )

    return results
  },

  async testEvent(
    configId: string,
    eventName = 'Purchase',
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.getById(configId)
    if (!config) return { success: false, message: 'Pixel não encontrado' }
    if (!config.pixelId) return { success: false, message: 'Pixel ID não configurado' }

    const payload: TrackEventPayload = {
      event: eventName,
      data: {
        value:        9990,
        currency:     'BRL',
        order_id:     `test_${Date.now()}`,
        content_ids:  ['plano-pro'],
        content_type: 'product',
        num_items:    1,
      },
      userData: { email: 'teste@ranigoods.com.br' },
    }

    let res: { success: boolean; message: string }

    switch (config.platform) {
      case 'meta':
        res = await fireMetaCAPI(config, eventName, payload, true)
        break
      case 'ga4':
        res = await fireGA4MP(config, eventName, payload)
        break
      case 'tiktok':
        res = await fireTikTokAPI(config, eventName, payload)
        break
      default:
        res = { success: true, message: 'Evento de teste registrado (client-side)' }
    }

    await this.addLog({
      configId,
      platform: config.platform,
      event:    eventName,
      success:  res.success,
      message:  res.message,
      data:     payload.data,
      isTest:   true,
    })

    return res
  },
}
