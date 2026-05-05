import clsx from 'clsx'
import { MetaIcon, GA4Icon, GoogleAdsIcon, TikTokIcon } from '@/components/icons'

export type Platform = 'meta' | 'ga4' | 'google_ads' | 'tiktok'

export const PLATFORM_CONFIG: Record<Platform, {
  label:            string
  color:            string
  bg:               string
  border:           string
  iconColor:        string
  idLabel:          string
  idPlaceholder:    string
  tokenLabel:       string
  tokenPlaceholder: string
  hasTestCode:      boolean
  hasConvLabel:     boolean
}> = {
  meta: {
    label:            'Meta Pixel',
    color:            '#006eff',
    bg:               'bg-blue-500/10',
    border:           'border-blue-500/20',
    iconColor:        '',
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
    iconColor:        '',
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
    iconColor:        '',
    idLabel:          'Conversion ID',
    idPlaceholder:    'Ex: AW-XXXXXXXXXX',
    tokenLabel:       'API Secret',
    tokenPlaceholder: 'xxxxxxxxxxxxxx',
    hasTestCode:      false,
    hasConvLabel:     true,
  },
  tiktok: {
    label:            'TikTok Pixel',
    color:            '#EE1D52',
    bg:               'bg-zinc-500/10',
    border:           'border-zinc-500/20',
    iconColor:        '',
    idLabel:          'Pixel ID',
    idPlaceholder:    'Ex: C4XXXXXXXXXXXXXXXX',
    tokenLabel:       'Access Token (Events API)',
    tokenPlaceholder: 'xxxxxxxxxxxxxx',
    hasTestCode:      false,
    hasConvLabel:     false,
  },
}

interface PlatformIconProps {
  platform:   Platform
  size?:      number
  className?: string
}

export function PlatformIcon({ platform, size = 20, className }: PlatformIconProps) {
  const style = { width: size, height: size, flexShrink: 0 }
  const cls   = clsx(className)

  switch (platform) {
    case 'meta':
      return <MetaIcon      className={cls} style={style} />
    case 'ga4':
      return <GA4Icon       className={cls} style={style} />
    case 'google_ads':
      return <GoogleAdsIcon className={cls} style={style} />
    case 'tiktok':
      return <TikTokIcon    className={cls} style={style} />
  }
}
