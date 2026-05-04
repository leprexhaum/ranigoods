'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import type { PixelConfig } from '@/lib/types/pixel'

interface PixelContextValue {
  pixels: PixelConfig[]
  isReady: boolean
  trackEvent: (event: string, data?: Record<string, unknown>) => void
  reload: () => void
}

const PixelContext = createContext<PixelContextValue>({
  pixels: [],
  isReady: false,
  trackEvent: () => {},
  reload: () => {},
})

export function usePixels() {
  return useContext(PixelContext)
}

declare global {
  interface Window {
    fbq?:       (...args: unknown[]) => void
    gtag?:      (...args: unknown[]) => void
    ttq?:       { track: (e: string, d?: Record<string, unknown>) => void; page: () => void }
    dataLayer?: unknown[]
  }
}

const GA4_EVENT_MAP: Record<string, string> = {
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

const TT_EVENT_MAP: Record<string, string> = {
  Purchase:             'CompletePayment',
  InitiateCheckout:     'InitiateCheckout',
  AddToCart:            'AddToCart',
  ViewContent:          'ViewContent',
  Lead:                 'SubmitForm',
  CompleteRegistration: 'CompleteRegistration',
  PageView:             'Pageview',
  AddPaymentInfo:       'AddPaymentInfo',
  Subscribe:            'Subscribe',
  Search:               'Search',
}

export default function PixelProvider({ children }: { children: React.ReactNode }) {
  const [pixels,  setPixels]  = useState<PixelConfig[]>([])
  const [isReady, setIsReady] = useState(false)
  const pathname  = usePathname()
  const didPageView = useRef(false)

  const loadPixels = useCallback(() => {
    fetch('/api/pixels/config')
      .then(r => r.json())
      .then((data: PixelConfig[]) => { setPixels(data); setIsReady(true) })
      .catch(() => setIsReady(true))
  }, [])

  useEffect(() => { loadPixels() }, [loadPixels])

  const trackEvent = useCallback((event: string, data?: Record<string, unknown>) => {
    const active = pixels.filter(p =>
      p.enabled && p.pixelId && p.events.some(e => e.event === event && e.enabled),
    )

    active.forEach(p => {
      switch (p.platform) {
        case 'meta':
          if (window.fbq) {
            data?.value
              ? window.fbq('track', event, { value: (data.value as number) / 100, currency: data.currency ?? 'BRL', ...data })
              : window.fbq('track', event)
          }
          break
        case 'ga4':
        case 'google_ads':
          if (window.gtag) {
            window.gtag('event', GA4_EVENT_MAP[event] ?? event.toLowerCase(), data ?? {})
          }
          break
        case 'tiktok':
          if (window.ttq) {
            window.ttq.track(TT_EVENT_MAP[event] ?? event, data ?? {})
          }
          break
      }
    })

    // Server-side via CAPI para pixels com accessToken
    const serverPixels = active.filter(p => p.accessToken)
    if (serverPixels.length > 0) {
      fetch('/api/pixels/track', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ event, data }),
      }).catch(() => {})
    }
  }, [pixels])

  // PageView em cada mudança de rota
  useEffect(() => {
    if (!isReady) return
    if (!didPageView.current) { didPageView.current = true; return }
    trackEvent('PageView')
  }, [pathname, isReady, trackEvent])

  const metaPixels   = pixels.filter(p => p.platform === 'meta'       && p.enabled && p.pixelId)
  const ga4Pixels    = pixels.filter(p => p.platform === 'ga4'        && p.enabled && p.pixelId)
  const gadsPixels   = pixels.filter(p => p.platform === 'google_ads' && p.enabled && p.pixelId)
  const tiktokPixels = pixels.filter(p => p.platform === 'tiktok'     && p.enabled && p.pixelId)

  return (
    <PixelContext.Provider value={{ pixels, isReady, trackEvent, reload: loadPixels }}>
      {/* ── Meta Pixel ────────────────────────────────────────────── */}
      {metaPixels.map(px => (
        <Script key={`meta-${px.id}`} id={`meta-${px.id}`} strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${px.pixelId}');fbq('track','PageView');
        `}</Script>
      ))}

      {/* ── Google Analytics 4 ────────────────────────────────────── */}
      {ga4Pixels.map(px => (
        <Script key={`ga4-${px.id}`} src={`https://www.googletagmanager.com/gtag/js?id=${px.pixelId}`} strategy="afterInteractive"
          onLoad={() => {
            window.dataLayer = window.dataLayer ?? []
            window.gtag = function (...a: unknown[]) { window.dataLayer!.push(a) }
            window.gtag('js', new Date())
            window.gtag('config', px.pixelId)
          }}
        />
      ))}

      {/* ── Google Ads ────────────────────────────────────────────── */}
      {gadsPixels.map(px => (
        <Script key={`gads-${px.id}`} src={`https://www.googletagmanager.com/gtag/js?id=${px.pixelId}`} strategy="afterInteractive"
          onLoad={() => {
            window.dataLayer = window.dataLayer ?? []
            window.gtag = function (...a: unknown[]) { window.dataLayer!.push(a) }
            window.gtag('js', new Date())
            window.gtag('config', px.pixelId)
          }}
        />
      ))}

      {/* ── TikTok Pixel ──────────────────────────────────────────── */}
      {tiktokPixels.map(px => (
        <Script key={`tt-${px.id}`} id={`tt-${px.id}`} strategy="afterInteractive">{`
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
ttq.load('${px.pixelId}');ttq.page();}(window,document,'ttq');
        `}</Script>
      ))}

      {children}
    </PixelContext.Provider>
  )
}
