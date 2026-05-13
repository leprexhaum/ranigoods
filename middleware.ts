import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE       = 'rg_session'
const PUBLIC_PATHS = ['/login', '/cadastro', '/', '/privacidade', '/termos', '/reembolso', '/entrega', '/cookies', '/contato']
const PUBLIC_PAGE_PREFIXES = ['/checkout']
const PUBLIC_API   = ['/api/auth/', '/api/pixels/track', '/api/pixels/config', '/api/stripe/webhook', '/api/checkout/', '/api/cron/', '/api/v1/', '/api/integrations/google-ads/callback', '/api/cron/check-domains']

function getKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET não configurado')
  return new TextEncoder().encode(secret)
}

type LogLevel = 'INFORMAÇÃO' | 'ALERTA' | 'ERRO'

const LEVEL_EMOJIS: Record<LogLevel, string> = {
  'INFORMAÇÃO': '✅',
  'ALERTA':     '⚠️',
  'ERRO':       '❌',
}

function mwLog(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const now = new Date()
  const br = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now)
  const parts: Record<string, string> = {}
  for (const p of br) { if (p.type !== 'literal') parts[p.type] = p.value }
  const ts = `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`
  const pairs = data ? ' | ' + Object.entries(data).filter(([,v]) => v !== undefined && v !== null && v !== '').map(([k,v]) => `${k}=${v}`).join(' ') : ''
  const line = `${LEVEL_EMOJIS[level]} [${ts}] [${level}] [🚧🚦 MIDDLEWARE] ${message}${pairs}`
  if (level === 'ERRO') console.error(line)
  else if (level === 'ALERTA') console.warn(line)
  else console.log(line)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('x-real-host') || req.headers.get('host') || ''
  const appHost = process.env.NEXT_PUBLIC_APP_HOST ?? 'techpags.shop'
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown'
  const method = req.method

  // Skip logging for static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  mwLog('INFORMAÇÃO', 'Requisição recebida', { method, path: pathname, ip, host })

  // Domínio customizado: bloqueia tudo exceto /checkout/* do próprio utilizador
  if (host && host !== appHost && !host.includes('localhost')) {
    // Permitir APIs necessárias para o checkout funcionar
    if (
      pathname.startsWith('/api/checkout/') ||
      pathname.startsWith('/api/pixels/track') ||
      pathname.startsWith('/api/pixels/config') ||
      pathname.startsWith('/api/stripe/webhook') ||
      pathname.startsWith('/api/geo-ip')
    ) {
      mwLog('INFORMAÇÃO', 'Domínio customizado — API permitida', { host, path: pathname })
      return NextResponse.next()
    }

    // Só permite /checkout/* — valida se o produto pertence ao utilizador do domínio
    if (pathname.startsWith('/checkout/')) {
      const segment = pathname.split('/')[2]
      if (segment === 'success' || segment === 'upsell' || segment === 'cart') {
        mwLog('INFORMAÇÃO', 'Domínio customizado detectado', { host, path: pathname, acao: 'permitido' })
        return NextResponse.next()
      }

      try {
        const slug    = segment
        const internalBase = `https://${appHost}`
        const res     = await fetch(`${internalBase}/api/products/by-domain?domain=${encodeURIComponent(host)}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.slug && slug === data.slug) {
            mwLog('INFORMAÇÃO', 'Domínio customizado detectado', { host, path: pathname, acao: 'permitido' })
            return NextResponse.next()
          }
        }
      } catch {
        return NextResponse.next()
      }
      mwLog('ALERTA', 'Domínio customizado — slug não corresponde', { host, slug: pathname.split('/')[2], acao: '404' })
      return new NextResponse('Not Found', { status: 404 })
    }

    mwLog('ALERTA', 'Domínio customizado — rota bloqueada', { host, path: pathname, acao: '404' })
    return new NextResponse('Not Found', { status: 404 })
  }

  // Sempre permitir rotas públicas de API, páginas de checkout e next internals
  if (
    PUBLIC_API.some(p => pathname.startsWith(p)) ||
    PUBLIC_PAGE_PREFIXES.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  const isPublicPage = PUBLIC_PATHS.includes(pathname)
  const token        = req.cookies.get(COOKIE)?.value

  // Sem token → só pode acessar páginas públicas
  if (!token) {
    if (isPublicPage) return NextResponse.next()
    mwLog('ALERTA', 'Sessão ausente — redirecionando', { path: pathname, ip, acao: 'redirect_login' })
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Verifica token
  try {
    const { payload } = await jwtVerify(token, getKey())
    const userId = (payload as { userId?: string }).userId ?? ''
    mwLog('INFORMAÇÃO', 'Sessão validada', { userId, path: pathname })
    if (isPublicPage) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  } catch {
    mwLog('ALERTA', 'Token inválido — sessão destruída', { path: pathname, ip, acao: 'redirect_login' })
    if (isPublicPage) return NextResponse.next()
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete(COOKIE)
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
