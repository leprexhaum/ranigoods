import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE       = 'rg_session'
const PUBLIC_PATHS = ['/login', '/cadastro']
const PUBLIC_PAGE_PREFIXES = ['/checkout']
const PUBLIC_API   = ['/api/auth/', '/api/pixels/track', '/api/pixels/config', '/api/stripe/webhook', '/api/checkout/', '/api/cron/', '/api/v1/']

function getKey() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET não configurado')
  return new TextEncoder().encode(secret)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const host = req.headers.get('host') ?? ''
  const appHost = process.env.NEXT_PUBLIC_APP_HOST ?? ''

  // Domínio customizado: se o host não é o domínio principal, procura produto e reescreve
  if (appHost && host && host !== appHost && !host.includes('localhost') && pathname === '/') {
    try {
      const baseUrl = req.nextUrl.origin
      const res = await fetch(`${baseUrl}/api/products/by-domain?domain=${encodeURIComponent(host)}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.slug) {
          return NextResponse.rewrite(new URL(`/checkout/${data.slug}`, req.url))
        }
      }
    } catch {
      // Se falhar, segue o fluxo normal
    }
  }

  // Sempre permitir rotas públicas de API, páginas de checkout e next internals
  if (
    PUBLIC_API.some(p => pathname.startsWith(p)) ||
    PUBLIC_PAGE_PREFIXES.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const isPublicPage = PUBLIC_PATHS.includes(pathname)
  const token        = req.cookies.get(COOKIE)?.value

  // Sem token → só pode acessar páginas públicas
  if (!token) {
    if (isPublicPage) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Verifica token
  try {
    await jwtVerify(token, getKey())
    // Token válido: redireciona /login e /cadastro para dashboard
    if (isPublicPage) return NextResponse.redirect(new URL('/dashboard', req.url))
    return NextResponse.next()
  } catch {
    // Token inválido: limpa cookie e redireciona para login
    if (isPublicPage) return NextResponse.next()
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.delete(COOKIE)
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
