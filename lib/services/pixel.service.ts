import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import type {
  PixelConfig, PixelFireLog, TrackEventPayload, PixelEventConfig,
} from '@/lib/types/pixel'
import { STANDARD_EVENTS } from '@/lib/types/pixel'

// ─── DB helpers ─────────────────────────────────────────────────────────────

function rowToConfig(r: {
  id: string; userId: string; platform: string; name: string; pixelId: string; accessToken: string;
  testEventCode: string; conversionLabel: string; enabled: boolean; events: unknown;
  createdAt: Date; updatedAt: Date;
}): PixelConfig {
  return {
    id:              r.id,
    userId:          r.userId,
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



// ─── Hashing helpers ─────────────────────────────────────────────────────────

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/** Normaliza telefone para E.164 sem + (Meta) ou com + (Google Ads) */
function normalizePhone(phone: string, withPlus = false): string {
  // Remove tudo exceto dígitos e +
  const digits = phone.replace(/[^\d+]/g, '')
  // Remove + inicial para obter só dígitos
  const onlyDigits = digits.replace(/^\+/, '')
  return withPlus ? `+${onlyDigits}` : onlyDigits
}

// ─── Meta Conversions API (v21.0) ────────────────────────────────────────────

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
  if (payload.userData?.phone)     userData.ph  = sha256(normalizePhone(payload.userData.phone))
  if (payload.userData?.firstName) userData.fn  = sha256(payload.userData.firstName)
  if (payload.userData?.lastName)  userData.ln  = sha256(payload.userData.lastName)
  // plain text — nunca hashear
  if (payload.userData?.ip)        userData.client_ip_address = payload.userData.ip
  if (payload.userData?.userAgent) userData.client_user_agent = payload.userData.userAgent
  if (payload.userData?.fbp)       userData.fbp = payload.userData.fbp
  if (payload.userData?.fbc)       userData.fbc = payload.userData.fbc

  const customData: Record<string, unknown> = {}
  if (payload.data?.value)        customData.value        = payload.data.value / 100
  if (payload.data?.currency)     customData.currency     = payload.data.currency
  if (payload.data?.content_ids)  customData.content_ids  = payload.data.content_ids
  if (payload.data?.content_type) customData.content_type = payload.data.content_type
  if (payload.data?.num_items)    customData.num_items    = payload.data.num_items
  if (payload.data?.order_id)     customData.order_id     = payload.data.order_id
  if (payload.data?.event_source_url) customData.event_source_url = payload.data.event_source_url
  if (payload.data?.items)        customData.contents     = payload.data.items.map(i => ({
    id: i.id, quantity: i.quantity, item_price: i.price / 100,
  }))

  // event_id deve ser consistente com o client-side para deduplicação
  // Usar order_id como base quando disponível
  const eventId = payload.data?.order_id
    ? `${eventName}_${payload.data.order_id}`
    : `${eventName}_${Date.now()}`

  const body: Record<string, unknown> = {
    data: [{
      event_name:        eventName,
      event_time:        Math.floor(Date.now() / 1000),
      event_id:          eventId,
      action_source:     'website',
      event_source_url:  payload.userData?.pageUrl,
      user_data:         userData,
      custom_data:       Object.keys(customData).length > 0 ? customData : undefined,
    }],
  }
  if (isTest && config.testEventCode) body.test_event_code = config.testEventCode

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${config.pixelId}/events?access_token=${config.accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    const json = await res.json() as { events_received?: number; error?: { message: string } }
    if (!res.ok) throw new Error(json.error?.message || `HTTP ${res.status}`)
    return { success: true, message: `Meta CAPI v21.0: ${json.events_received ?? 1} evento(s) recebido(s)` }
  } catch (err) {
    return { success: false, message: `Meta CAPI: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ─── GA4 Measurement Protocol ────────────────────────────────────────────────

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

  // client_id deve ser o valor do cookie _ga do browser
  // Formato: GA1.1.XXXXXXXXXX.XXXXXXXXXX
  // Se não disponível, usar userId ou fallback estável por IP
  const clientId = payload.userData?.clientId
    ?? payload.userData?.userId
    ?? `server_${(payload.userData?.ip ?? 'unknown').replace(/\./g, '_')}`

  const items = payload.data?.items?.map(i => ({
    item_id:   i.id,
    item_name: i.name,
    quantity:  i.quantity,
    price:     i.price / 100,
  }))

  const params: Record<string, unknown> = {
    engagement_time_msec: 100,
  }
  if (payload.data?.currency)     params.currency       = payload.data.currency
  if (payload.data?.value)        params.value          = payload.data.value / 100
  if (payload.data?.order_id)     params.transaction_id = payload.data.order_id
  if (items?.length)              params.items          = items

  const body = {
    client_id: clientId,
    ...(payload.userData?.userId ? { user_id: payload.userData.userId } : {}),
    events: [{
      name:   ga4EventMap[eventName] ?? eventName.toLowerCase(),
      params,
    }],
  }

  try {
    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${config.pixelId}&api_secret=${config.accessToken}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    // GA4 sempre retorna 204 em produção mesmo com payload inválido
    if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`)
    return { success: true, message: 'GA4 Measurement Protocol: evento enviado' }
  } catch (err) {
    return { success: false, message: `GA4 MP: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ─── TikTok Events API (v1.3) ────────────────────────────────────────────────

async function fireTikTokAPI(
  config: PixelConfig,
  eventName: string,
  payload: TrackEventPayload,
): Promise<{ success: boolean; message: string }> {
  if (!config.pixelId || !config.accessToken) {
    return { success: false, message: 'Pixel ID ou Access Token não configurado' }
  }

  // Mapeamento para nomes oficiais v1.3
  const ttEventMap: Record<string, string> = {
    Purchase:             'PlaceAnOrder',
    InitiateCheckout:     'InitiateCheckout',
    AddToCart:            'AddToCart',
    ViewContent:          'ViewContent',
    Lead:                 'SubmitForm',
    CompleteRegistration: 'CompleteRegistration',
    PageView:             'Pageview',
    Subscribe:            'Subscribe',
    AddPaymentInfo:       'AddPaymentInfo',
    Search:               'Search',
    Contact:              'Contact',
  }

  const userObj: Record<string, string | undefined> = {}
  if (payload.userData?.email)     userObj.email        = sha256(payload.userData.email)
  if (payload.userData?.phone)     userObj.phone_number = sha256(normalizePhone(payload.userData.phone))
  // plain text — nunca hashear
  if (payload.userData?.ip)        userObj.ip           = payload.userData.ip
  if (payload.userData?.userAgent) userObj.user_agent   = payload.userData.userAgent
  if (payload.userData?.ttp)       userObj.ttp          = payload.userData.ttp

  const body: Record<string, unknown> = {
    pixel_code: config.pixelId,
    event:      ttEventMap[eventName] ?? eventName,
    event_id:   payload.data?.order_id
      ? `${eventName}_${payload.data.order_id}`
      : `${eventName}_${Date.now()}`,
    timestamp:  new Date().toISOString(),
    context: {
      user: userObj,
      page: {
        url: payload.userData?.pageUrl ?? '',
      },
      ...(payload.userData?.ttclid ? { ad: { callback: payload.userData.ttclid } } : {}),
    },
    properties: payload.data?.value ? {
      value:       payload.data.value / 100,
      currency:    payload.data.currency ?? 'EUR',
      content_ids: payload.data.content_ids,
      quantity:    payload.data.num_items,
      order_id:    payload.data.order_id,
      contents:    payload.data.items?.map(i => ({
        content_id:   i.id,
        content_name: i.name,
        quantity:     i.quantity,
        price:        i.price / 100,
      })),
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
    return { success: true, message: 'TikTok Events API v1.3: evento enviado' }
  } catch (err) {
    return { success: false, message: `TikTok API: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ─── Public service ──────────────────────────────────────────────────────────

const DEFAULT_EVENTS = () => STANDARD_EVENTS.map(e => ({
  event:      e,
  enabled:    e === 'Purchase' || e === 'PageView',
  valueParam: e === 'Purchase',
}))

export const pixelService = {
  async getAll(userId: string): Promise<PixelConfig[]> {
    const rows = await prisma.pixelConfig.findMany({
      where:   { userId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(rowToConfig)
  },

  async getById(id: string, userId?: string): Promise<PixelConfig | null> {
    const r = await prisma.pixelConfig.findUnique({ where: { id } })
    if (!r) return null
    if (userId && r.userId !== userId) return null
    return rowToConfig(r)
  },

  async create(
    userId: string,
    data: { platform: string; name?: string; pixelId?: string; accessToken?: string; testEventCode?: string; conversionLabel?: string; enabled?: boolean },
  ): Promise<PixelConfig> {
    const r = await prisma.pixelConfig.create({
      data: {
        userId,
        platform:        data.platform,
        name:            data.name            ?? '',
        pixelId:         data.pixelId         ?? '',
        accessToken:     data.accessToken     ?? '',
        testEventCode:   data.testEventCode   ?? '',
        conversionLabel: data.conversionLabel ?? '',
        enabled:         data.enabled         ?? true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        events:          DEFAULT_EVENTS() as any,
      },
    })
    return rowToConfig(r)
  },

  async update(
    id: string,
    userId: string,
    data: Partial<Omit<PixelConfig, 'id' | 'platform' | 'createdAt' | 'userId'>>,
  ): Promise<PixelConfig | null> {
    try {
      const existing = await prisma.pixelConfig.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) return null
      const { events, ...rest } = data
      const r = await prisma.pixelConfig.update({
        where: { id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data:  { ...rest, ...(events !== undefined ? { events: events as any } : {}) },
      })
      return rowToConfig(r)
    } catch {
      return null
    }
  },

  async delete(id: string, userId: string): Promise<boolean> {
    try {
      const existing = await prisma.pixelConfig.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) return false

      // Remover pixelId de todos os produtos do userId
      const products = await prisma.product.findMany({
        where: { userId },
        select: { id: true, pixelIds: true },
      })
      for (const p of products) {
        const ids = (p.pixelIds as string[]).filter(pid => pid !== id)
        if (ids.length !== (p.pixelIds as string[]).length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await prisma.product.update({ where: { id: p.id }, data: { pixelIds: ids as any } })
        }
      }

      await prisma.pixelConfig.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  },

  async getLogs(userId: string, limit = 100): Promise<PixelFireLog[]> {
    const rows = await prisma.pixelLog.findMany({
      where:   { userId },
      orderBy: { timestamp: 'desc' },
      take:    limit,
    })
    return rows.map(rowToLog)
  },

  async clearLogs(userId: string): Promise<void> {
    await prisma.pixelLog.deleteMany({ where: { userId } })
  },

  async addLog(entry: Omit<PixelFireLog, 'id' | 'timestamp'> & { userId?: string }): Promise<PixelFireLog> {
    const r = await prisma.pixelLog.create({
      data: {
        userId:    entry.userId    ?? '',
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

  async trackEvent(eventName: string, payload: TrackEventPayload, userId?: string): Promise<PixelFireLog[]> {
    const where: Record<string, unknown> = { enabled: true }
    if (userId) where.userId = userId

    const allConfigs = await prisma.pixelConfig.findMany({ where })
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
          userId:   config.userId,
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
    userId: string,
    eventName = 'Purchase',
  ): Promise<{ success: boolean; message: string }> {
    const config = await this.getById(configId, userId)
    if (!config) return { success: false, message: 'Pixel não encontrado' }
    if (!config.pixelId) return { success: false, message: 'Pixel ID não configurado' }

    const payload: TrackEventPayload = {
      event: eventName,
      data: {
        value:        9990,
        currency:     'EUR',
        order_id:     `test_${Date.now()}`,
        content_ids:  ['produto-teste'],
        content_type: 'product',
        num_items:    1,
        items:        [{ id: 'produto-teste', name: 'Produto Teste', quantity: 1, price: 9990 }],
      },
      userData: {
        email:    'teste@ranigoods.com',
        clientId: 'GA1.1.000000000.000000000',
        pageUrl:  'https://ranigoods.com/checkout/teste',
      },
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
      userId:   userId,
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
