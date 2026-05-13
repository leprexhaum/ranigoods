type LogLevel = 'INFORMAÇÃO' | 'ALERTA' | 'ERRO' | 'FATAL'

const COLORS: Record<LogLevel, string> = {
  'INFORMAÇÃO': '\x1b[36m',
  'ALERTA':     '\x1b[33m',
  'ERRO':       '\x1b[31m',
  'FATAL':      '\x1b[35m',
}
const RESET = '\x1b[0m'

const EMOJIS: Record<LogLevel, string> = {
  'INFORMAÇÃO': '✅',
  'ALERTA':     '⚠️',
  'ERRO':       '❌',
  'FATAL':      '💀',
}

const MODULE_EMOJIS: Record<string, string> = {
  'WEBHOOK':     '📩',
  'AUTH':        '🔑',
  'CHECKOUT':    '🛒',
  'STRIPE-API':  '🧩',
  'PIXEL':       '📈',
  'DOMÍNIO':     '🌐',
  'CRON':        '⏳',
  'PRODUTO':     '📦',
  'PAGAMENTO':   '💲',
  'PEDIDO':      '🧾',
  'DASHBOARD':   '🗃️',
  'CONFIG':      '🛠️',
  'API-KEY':     '💊',
  'PUSHCUT':     '📲',
  'UTMIFY':      '🎯',
  'WEBHOOK-OUT': '🛫',
  'EMAIL':       '📩',
  'UPSELL':      '🫰',
  'MIDDLEWARE':  '🚧🚦',
}

function timestamp(): string {
  const now = new Date()
  const br = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const parts: Record<string, string> = {}
  for (const p of br) {
    if (p.type !== 'literal') parts[p.type] = p.value
  }
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`
}

function sanitize(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.length > 200) return str.slice(0, 200) + '…'
  return str
}

function formatData(data?: Record<string, unknown>): string {
  if (!data || Object.keys(data).length === 0) return ''
  const pairs = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}=${JSON.stringify(v)}`
      if (typeof v === 'object') return `${k}=${JSON.stringify(v)}`
      return `${k}=${sanitize(v)}`
    })
    .join(' ')
  return pairs ? ` | ${pairs}` : ''
}

function log(level: LogLevel, module: string, message: string, data?: Record<string, unknown>) {
  const emoji = EMOJIS[level]
  const color = COLORS[level]
  const moduleEmoji = MODULE_EMOJIS[module] ?? ''
  const moduleTag = moduleEmoji ? `${moduleEmoji} ${module}` : module
  const line = `${emoji} ${color}[${timestamp()}] [${level}] [${moduleTag}]${RESET} ${message}${formatData(data)}`

  switch (level) {
    case 'FATAL':
    case 'ERRO':
      console.error(line)
      break
    case 'ALERTA':
      console.warn(line)
      break
    default:
      console.log(line)
  }
}

export const logger = {
  info: (module: string, message: string, data?: Record<string, unknown>) =>
    log('INFORMAÇÃO', module, message, data),

  warn: (module: string, message: string, data?: Record<string, unknown>) =>
    log('ALERTA', module, message, data),

  error: (module: string, message: string, data?: Record<string, unknown>) =>
    log('ERRO', module, message, data),

  fatal: (module: string, message: string, data?: Record<string, unknown>) =>
    log('FATAL', module, message, data),
}
