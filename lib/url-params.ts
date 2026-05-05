const STORAGE_KEY = 'rani_url_params'

const KNOWN_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'src', 'sck', 'fbclid', 'fbp', 'fbc', 'ttclid', 'ttp', 'gclid',
]

export function captureUrlParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const captured: Record<string, string> = {}

  params.forEach((value, key) => {
    if (value) captured[key] = value
  })

  const existing = getStoredUrlParams()
  const merged = { ...existing, ...captured }

  if (Object.keys(merged).length > 0) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    } catch {
      // sessionStorage indisponível
    }
  }

  return merged
}

export function getStoredUrlParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}
