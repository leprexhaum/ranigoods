'use client'

import { useEffect, useRef, useCallback } from 'react'

interface PixelConfigLight {
  id:              string
  platform:        string
  pixelId:         string
  accessToken:     string
  conversionLabel: string
  events:          { event: string; enabled: boolean }[]
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

function injectScript(id: string, content: string) {
  if (document.getElementById(id)) return
  const s = document.createElement('script')
  s.id   = id
  s.type = 'text/javascript'
  s.text = content
  document.body.appendChild(s)
}

function injectSrcScript(id: string, src: string, onLoad?: () => void) {
  if (document.getElementById(id)) { onLoad?.(); return }
  const s = document.createElement('script')
  s.id    = id
  s.type  = 'text/javascript'
  s.async = true
  s.src   = src
  if (onLoad) s.onload = onLoad
  document.body.appendChild(s)
}

export function useCheckoutPixels(productIds: string | string[]) {
  const pixelsRef  = useRef<PixelConfigLight[]>([])
  const loadedRef  = useRef(false)
  const idsKey     = Array.isArray(productIds) ? productIds.join(',') : productIds

  useEffect(() => {
    if (!idsKey) return

    const ids = Array.isArray(productIds) ? productIds : [productIds]

    // Buscar pixels de todos os produtos e unificar
    Promise.all(ids.map(id =>
      fetch(`/api/pixels/config?productId=${id}`)
        .then(r => r.json() as Promise<PixelConfigLight[]>)
        .catch(() => [] as PixelConfigLight[]),
    )).then(results => {
      // União de pixels únicos por id
      const map = new Map<string, PixelConfigLight>()
      results.flat().forEach(p => { if (!map.has(p.id)) map.set(p.id, p) })
      pixelsRef.current = Array.from(map.values())

      if (loadedRef.current) return
      loadedRef.current = true

      // Injetar scripts
      pixelsRef.current.forEach(p => {
        switch (p.platform) {
          case 'meta':
            injectScript(`px-meta-${p.id}`, `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${p.pixelId}');fbq('track','PageView');`)
            break
          case 'ga4':
            injectSrcScript(`px-ga4-src-${p.id}`, `https://www.googletagmanager.com/gtag/js?id=${p.pixelId}`, () => {
              window.dataLayer = window.dataLayer ?? []
              window.gtag = function (...a: unknown[]) { window.dataLayer!.push(a) }
              window.gtag('js', new Date())
              window.gtag('config', p.pixelId)
            })
            break
          case 'google_ads':
            injectSrcScript(`px-gads-src-${p.id}`, `https://www.googletagmanager.com/gtag/js?id=${p.pixelId}`, () => {
              window.dataLayer = window.dataLayer ?? []
              window.gtag = function (...a: unknown[]) { window.dataLayer!.push(a) }
              window.gtag('js', new Date())
              window.gtag('config', p.pixelId)
            })
            break
          case 'tiktok':
            injectScript(`px-tt-${p.id}`, `
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
ttq.load('${p.pixelId}');ttq.page();}(window,document,'ttq');`)
            break
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  const trackEvent = useCallback((eventName: string, data?: Record<string, unknown>) => {
    const active = pixelsRef.current.filter(p =>
      p.pixelId && p.events.some(e => e.event === eventName && e.enabled),
    )

    active.forEach(p => {
      switch (p.platform) {
        case 'meta':
          if (window.fbq) {
            data?.value
              ? window.fbq('track', eventName, { value: (data.value as number) / 100, currency: data.currency ?? 'EUR', ...data })
              : window.fbq('track', eventName)
          }
          break
        case 'ga4':
        case 'google_ads':
          if (window.gtag) {
            window.gtag('event', GA4_EVENT_MAP[eventName] ?? eventName.toLowerCase(), data ?? {})
          }
          break
        case 'tiktok':
          if (window.ttq) {
            window.ttq.track(TT_EVENT_MAP[eventName] ?? eventName, data ?? {})
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
        body:    JSON.stringify({ event: eventName, data }),
      }).catch(() => {})
    }
  }, [])

  return { trackEvent }
}
