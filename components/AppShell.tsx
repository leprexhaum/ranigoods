'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Menu, X,
  LayoutDashboard, Package, CreditCard,
  Cpu, Calculator, Settings, LogOut, Key, BookOpen,
  ShoppingCart, GitFork, ShoppingBag, Plug, Globe, Palette,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/components/providers/AuthProvider'

const navItems = [
  { href: '/dashboard',             label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/produtos',              label: 'Produtos',      icon: Package         },
  { href: '/pagamentos',            label: 'Pagamentos',    icon: CreditCard      },
  { href: '/orders',                label: 'Pedidos',       icon: ShoppingBag     },
  { href: '/pixels',                label: 'Pixels',        icon: Cpu             },
  { href: '/funis',                 label: 'Funis',         icon: GitFork         },
  { href: '/carrinhos-abandonados', label: 'Carrinhos',     icon: ShoppingCart    },
  { href: '/integracoes',           label: 'Integrações',   icon: Plug            },
  { href: '/dominios',              label: 'Domínios',      icon: Globe           },
  { href: '/checkout-editor',       label: 'Checkout',      icon: Palette         },
  { href: '/calculadora',           label: 'Calculadora',   icon: Calculator      },
  { href: '/api-keys',              label: 'API Keys',      icon: Key             },
  { href: '/docs',                  label: 'Docs API',      icon: BookOpen        },
  { href: '/configuracoes',         label: 'Configurações', icon: Settings        },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const initial = user?.username?.[0]?.toUpperCase() ?? 'U'

  return (
    <aside className="flex flex-col h-full w-60 bg-ep-surface border-r border-ep-border-subtle">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ep-border-subtle">
        <Link href="/dashboard" onClick={onClose} className="min-w-0">
          <Image
            src="/logotechpags.png"
            alt="TechPags"
            width={140}
            height={36}
            className="object-contain"
            priority
          />
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-ep-muted hover:text-ep-primary p-1 flex-shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-ep-accent/10 text-ep-accent border border-ep-accent/20'
                  : 'text-ep-secondary hover:text-ep-primary hover:bg-ep-raised border border-transparent'
              )}
            >
              <Icon
                size={16}
                strokeWidth={active ? 2.5 : 2}
                className={active ? 'text-ep-accent' : 'text-ep-muted'}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer — usuário + logout */}
      <div className="px-4 py-4 border-t border-ep-border-subtle space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-ep-accent/20 border border-ep-accent/30 flex items-center justify-center flex-shrink-0">
            <span className="text-ep-accent text-xs font-bold">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-ep-primary text-xs font-semibold truncate">@{user?.username ?? '…'}</p>
            <p className="text-ep-muted text-xs truncate">{user?.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-ep-muted hover:text-ep-danger hover:bg-ep-danger/10 border border-transparent hover:border-ep-danger/20 transition-all"
        >
          <LogOut size={13} />
          Sair da conta
        </button>
      </div>
    </aside>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const hideSidebar = pathname === '/componentes'

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (hideSidebar) {
    return <div className="min-h-screen bg-ep-base">{children}</div>
  }

  return (
    <div className="flex min-h-screen bg-ep-base">
      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 h-screen z-30">
        <SidebarContent />
      </div>

      {/* Mobile backdrop + sidebar */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setOpen(false)}
        />
      )}
      <div className={clsx(
        'lg:hidden fixed top-0 left-0 h-screen z-50 transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full',
      )}>
        <SidebarContent onClose={() => setOpen(false)} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 lg:ml-60 min-h-screen flex flex-col">
        {/* Header mobile */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-ep-surface border-b border-ep-border-subtle">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 -ml-1 text-ep-secondary hover:text-ep-primary rounded-md hover:bg-ep-raised transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <Link href="/dashboard">
            <Image
              src="/logotechpags.png"
              alt="TechPags"
              width={120}
              height={32}
              className="object-contain"
            />
          </Link>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
