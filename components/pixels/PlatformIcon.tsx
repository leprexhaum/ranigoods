import clsx from 'clsx'

export type Platform = 'meta' | 'ga4' | 'google_ads' | 'tiktok'

// SVGs inline oficiais (simpleicons.org / brand guidelines)
function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 7.5c-.828 0-1.5.672-1.5 1.5v1.5h1.5l-.375 1.5H15V18h-1.5v-4.5h-1.5V12h1.5v-1.5c0-1.657 1.343-3 3-3h1.5v1.5H16.5z"/>
    </svg>
  )
}

function GA4Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#E37400"/>
      <path d="M12.5 7h-1v5.5l4.25 2.55.75-1.23-4-2.37V7z" fill="white"/>
      <circle cx="12" cy="12" r="2" fill="white"/>
    </svg>
  )
}

function GoogleAdsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.084 17.5L8.5 6.5l3.25 5.625-3.25 5.625H2.084z" fill="#FBBC04"/>
      <path d="M15.5 6.5L9.084 17.5h6.832L22.332 6.5H15.5z" fill="#4285F4"/>
      <circle cx="19" cy="17.5" r="3.5" fill="#34A853"/>
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
    </svg>
  )
}

export const PLATFORM_CONFIG: Record<Platform, {
  label:       string
  color:       string
  bg:          string
  border:      string
  iconColor:   string
  idLabel:     string
  idPlaceholder: string
  tokenLabel:  string
  tokenPlaceholder: string
  hasTestCode: boolean
  hasConvLabel: boolean
}> = {
  meta: {
    label:            'Meta Pixel',
    color:            '#1877F2',
    bg:               'bg-blue-500/10',
    border:           'border-blue-500/20',
    iconColor:        'text-[#1877F2]',
    idLabel:          'Pixel ID',
    idPlaceholder:    'Ex: 1234567890123456',
    tokenLabel:       'Access Token (CAPI)',
    tokenPlaceholder: 'EAAN...',
    hasTestCode:      true,
    hasConvLabel:     false,
  },
  ga4: {
    label:            'Google Analytics 4',
    color:            '#E37400',
    bg:               'bg-orange-500/10',
    border:           'border-orange-500/20',
    iconColor:        'text-[#E37400]',
    idLabel:          'Measurement ID',
    idPlaceholder:    'Ex: G-XXXXXXXXXX',
    tokenLabel:       'API Secret (Measurement Protocol)',
    tokenPlaceholder: 'xxxxxxxxxxxxxx',
    hasTestCode:      false,
    hasConvLabel:     false,
  },
  google_ads: {
    label:            'Google Ads',
    color:            '#4285F4',
    bg:               'bg-blue-400/10',
    border:           'border-blue-400/20',
    iconColor:        'text-[#4285F4]',
    idLabel:          'Conversion ID',
    idPlaceholder:    'Ex: AW-XXXXXXXXXX',
    tokenLabel:       'API Secret',
    tokenPlaceholder: 'xxxxxxxxxxxxxx',
    hasTestCode:      false,
    hasConvLabel:     true,
  },
  tiktok: {
    label:            'TikTok Pixel',
    color:            '#000000',
    bg:               'bg-zinc-500/10',
    border:           'border-zinc-500/20',
    iconColor:        'text-zinc-100',
    idLabel:          'Pixel ID',
    idPlaceholder:    'Ex: C4XXXXXXXXXXXXXXXX',
    tokenLabel:       'Access Token (Events API)',
    tokenPlaceholder: 'xxxxxxxxxxxxxx',
    hasTestCode:      false,
    hasConvLabel:     false,
  },
}

export function PlatformIcon({ platform, size = 20, className }: { platform: Platform; size?: number; className?: string }) {
  const cls = clsx(`w-[${size}px] h-[${size}px]`, className)
  switch (platform) {
    case 'meta':       return <MetaIcon       className={cls} />
    case 'ga4':        return <GA4Icon        className={cls} />
    case 'google_ads': return <GoogleAdsIcon  className={cls} />
    case 'tiktok':     return <TikTokIcon     className={cls} />
  }
}
