const STORAGE_KEY = 'rani_url_params'

// Parâmetros conhecidos de plataformas de anúncios
const KNOWN_PARAMS = new Set([
  // UTM padrão
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id',
  // Meta / Facebook
  'fbclid', 'fbp', 'fbc',
  // Google Ads / GA4
  'gclid', 'gclsrc', 'dclid', 'wbraid', 'gbraid',
  // TikTok
  'ttclid', 'ttp',
  // Outros
  'src', 'sck', 'ref', 'affiliate', 'coupon', 'promo',
  // Microsoft / Bing
  'msclkid',
  // Pinterest
  'epik',
  // Snapchat
  'ScCid',
  // Twitter / X
  'twclid',
])

function persist(data: Record<string, string>) {
  const json = JSON.stringify(data)
  try { sessionStorage.setItem(STORAGE_KEY, json) } catch { /* ignorar */ }
  try { localStorage.setItem(STORAGE_KEY, json) } catch { /* ignorar */ }
}

export function captureUrlParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const captured: Record<string, string> = {}

  // Captura TODOS os parâmetros — conhecidos e customizados
  params.forEach((value, key) => {
    if (value && key) captured[key] = value
  })

  const existing = getStoredUrlParams()

  // Parâmetros conhecidos têm prioridade sobre os existentes (frescos)
  // Parâmetros customizados existentes são mantidos se não vieram novos
  const merged: Record<string, string> = { ...existing }
  for (const [k, v] of Object.entries(captured)) {
    // Sempre atualiza parâmetros conhecidos; para customizados, só se não existir
    if (KNOWN_PARAMS.has(k) || !merged[k]) {
      merged[k] = v
    }
  }

  if (Object.keys(merged).length > 0) persist(merged)

  return merged
}

export function getStoredUrlParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    // Tenta sessionStorage primeiro, depois localStorage como fallback
    const raw = sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function clearStoredUrlParams() {
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignorar */ }
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignorar */ }
}

// Agrupa os parâmetros por plataforma para exibição
export function groupUrlParams(params: Record<string, string>): {
  utm: Record<string, string>
  meta: Record<string, string>
  google: Record<string, string>
  tiktok: Record<string, string>
  other: Record<string, string>
} {
  const utm: Record<string, string> = {}
  const meta: Record<string, string> = {}
  const google: Record<string, string> = {}
  const tiktok: Record<string, string> = {}
  const other: Record<string, string> = {}

  for (const [k, v] of Object.entries(params)) {
    if (k.startsWith('utm_')) utm[k] = v
    else if (['fbclid', 'fbp', 'fbc'].includes(k)) meta[k] = v
    else if (['gclid', 'gclsrc', 'dclid', 'wbraid', 'gbraid'].includes(k)) google[k] = v
    else if (['ttclid', 'ttp'].includes(k)) tiktok[k] = v
    else other[k] = v
  }

  return { utm, meta, google, tiktok, other }
}
