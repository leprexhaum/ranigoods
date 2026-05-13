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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // X-Real-Host é injetado pelo Cloudflare Worker quando vem de domínio customizado
  const host = req.headers.get('x-real-host') || req.headers.get('host') || ''
  const appHost = process.env.NEXT_PUBLIC_APP_HOST ?? 'techpags.shop'

  // Domínio customizado: bloqueia tudo exceto /checkout/* do próprio utilizador
  if (host && host !== appHost && !host.includes('localhost')) {
    // Permitir assets internos do Next.js sempre
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      /\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(pathname)
    ) {
      return NextResponse.next()
    }

    // Permitir APIs necessárias para o checkout funcionar
    if (
      pathname.startsWith('/api/checkout/') ||
      pathname.startsWith('/api/pixels/track') ||
      pathname.startsWith('/api/pixels/config') ||
      pathname.startsWith('/api/stripe/webhook') ||
      pathname.startsWith('/api/geo-ip')
    ) {
      return NextResponse.next()
    }

    // Só permite /checkout/* — valida se o produto pertence ao utilizador do domínio
    if (pathname.startsWith('/checkout/')) {
      // /checkout/success e /checkout/upsell/* não têm slug — permitir sempre
      const segment = pathname.split('/')[2]
      if (segment === 'success' || segment === 'upsell' || segment === 'cart') {
        return NextResponse.next()
      }

      try {
        const slug    = segment
        // Usar sempre o domínio principal para o fetch interno — evita problemas
        // com host interno do Zeabur/Railway no req.nextUrl.origin
        const internalBase = `https://${appHost}`
        const res     = await fetch(`${internalBase}/api/products/by-domain?domain=${encodeURIComponent(host)}`)
        if (res.ok) {
          const data = await res.json()
          // Só permite se o slug do produto bater com o domínio do utilizador
          if (data?.slug && slug === data.slug) {
            return NextResponse.next()
          }
        }
      } catch {
        // Se o fetch falhar, permite passar — evita bloquear o checkout por erro interno
        return NextResponse.next()
      }
      return new NextResponse('Not Found', { status: 404 })
    }

    // Qualquer outra rota num domínio customizado → 404
    return new NextResponse('Not Found', { status: 404 })
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
