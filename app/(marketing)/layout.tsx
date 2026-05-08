import Link from 'next/link'
import Image from 'next/image'

function MarketingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-ep-border-subtle bg-ep-base/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logotechpags.png" alt="TechPag" width={120} height={32} className="h-8 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ep-secondary">
          <Link href="/#como-funciona" className="hover:text-ep-primary transition-colors">Como funciona</Link>
          <Link href="/#planos" className="hover:text-ep-primary transition-colors">Planos</Link>
          <Link href="/contato" className="hover:text-ep-primary transition-colors">Contato</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-ep-secondary hover:text-ep-primary transition-colors">
            Entrar
          </Link>
          <Link
            href="/contato"
            className="text-sm font-medium bg-ep-accent text-ep-base px-4 py-2 rounded-md hover:bg-ep-accent-light transition-colors"
          >
            Solicitar acesso
          </Link>
        </div>
      </div>
    </header>
  )
}

function MarketingFooter() {
  return (
    <footer className="border-t border-ep-border-subtle bg-ep-surface mt-24">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1">
            <Link href="/">
              <Image src="/logotechpags.png" alt="TechPag" width={120} height={32} className="h-8 w-auto mb-4" />
            </Link>
            <p className="text-sm text-ep-secondary leading-relaxed">
              Plataforma de gestão de cobranças e faturamento digital integrado.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ep-primary mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-ep-secondary">
              <li>William Ferrugini Amaral</li>
              <li>NIF: 307338061</li>
              <li>Carreira de São Tiago, Nº 22 A</li>
              <li>7320-157 Castelo de Vide</li>
              <li>Portugal</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ep-primary mb-4">Contato</h4>
            <ul className="space-y-2 text-sm text-ep-secondary">
              <li><a href="mailto:contact@pagstech.shop" className="hover:text-ep-accent transition-colors">contact@pagstech.shop</a></li>
              <li><a href="tel:+351212307800" className="hover:text-ep-accent transition-colors">+351 21 230 7800</a></li>
              <li><a href="tel:+351937642189" className="hover:text-ep-accent transition-colors">+351 937 642 189</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ep-primary mb-4">Políticas</h4>
            <ul className="space-y-2 text-sm text-ep-secondary">
              <li><Link href="/termos" className="hover:text-ep-accent transition-colors">Termos de Serviço</Link></li>
              <li><Link href="/privacidade" className="hover:text-ep-accent transition-colors">Política de Privacidade</Link></li>
              <li><Link href="/reembolso" className="hover:text-ep-accent transition-colors">Política de Reembolso</Link></li>
              <li><Link href="/entrega" className="hover:text-ep-accent transition-colors">Política de Entrega</Link></li>
              <li><Link href="/cookies" className="hover:text-ep-accent transition-colors">Política de Cookies</Link></li>
              <li><Link href="/contato" className="hover:text-ep-accent transition-colors">Página de Contato</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-ep-border-subtle flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ep-muted">© 2026 TechPag. Todos os direitos reservados.</p>
          <p className="text-xs text-ep-muted">A TechPag não processa pagamentos diretamente.</p>
        </div>
      </div>
    </footer>
  )
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingNav />
      <main className="pt-16">{children}</main>
      <MarketingFooter />
    </>
  )
}
