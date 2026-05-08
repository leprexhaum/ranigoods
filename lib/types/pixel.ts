export type PixelPlatform = 'meta' | 'ga4' | 'google_ads' | 'tiktok'

export const STANDARD_EVENTS = [
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'AddPaymentInfo',
  'Purchase',
  'Lead',
  'CompleteRegistration',
  'Subscribe',
  'StartTrial',
  'Search',
] as const

export type StandardEvent = (typeof STANDARD_EVENTS)[number]

export interface PixelEventConfig {
  event: StandardEvent
  enabled: boolean
  valueParam: boolean
}

export interface PixelConfig {
  id: string
  userId: string
  platform: PixelPlatform
  name: string
  pixelId: string
  accessToken: string
  testEventCode: string
  conversionLabel: string
  enabled: boolean
  events: PixelEventConfig[]
  createdAt: string
  updatedAt: string
  // Google Ads — modo avançado
  refreshToken?: string
  customerId?: string
  conversionActionId?: string
}

export interface PixelFireLog {
  id: string
  configId: string
  platform: PixelPlatform
  event: string
  success: boolean
  message: string
  timestamp: string
  data?: Record<string, unknown>
  isTest?: boolean
}

export interface TrackEventPayload {
  event: string
  data?: {
    value?: number
    currency?: string
    content_ids?: string[]
    content_type?: string
    num_items?: number
    order_id?: string
    event_source_url?: string
    items?: Array<{ id: string; name: string; quantity: number; price: number }>
    [key: string]: unknown
  }
  userData?: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    ip?: string
    userAgent?: string
    // Meta
    fbp?: string
    fbc?: string
    // TikTok
    ttp?: string
    ttclid?: string
    // GA4
    clientId?: string   // valor do cookie _ga
    userId?: string
    // Google Ads
    gclid?: string
    // page
    pageUrl?: string
  }
}
