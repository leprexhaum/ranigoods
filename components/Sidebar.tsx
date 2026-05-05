'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  CreditCard,
  Cpu,
  Calculator,
  Settings,
  Zap,
  Webhook,
  ShoppingCart,
  Activity,
  GitFork,
  ShoppingBag,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/dashboard',             label: 'Dashboard',           icon: LayoutDashboard },
  { href: '/produtos',              label: 'Produtos',            icon: Package         },
  { href: '/pagamentos',            label: 'Pagamentos',          icon: CreditCard      },
  { href: '/orders',                label: 'Pedidos',             icon: ShoppingBag     },
  { href: '/pixels',                label: 'Pixels',              icon: Cpu             },
  { href: '/funis',                 label: 'Funis',               icon: GitFork         },
  { href: '/carrinhos-abandonados', label: 'Carrinhos',           icon: ShoppingCart    },
  { href: '/webhooks',              label: 'Webhooks',            icon: Webhook         },
  { href: '/stripe-eventos',        label: 'Eventos Stripe',      icon: Activity        },
  { href: '/calculadora',           label: 'Calculadora',         icon: Calculator      },
  { href: '/configuracoes',         label: 'Configurações',       icon: Settings        },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 flex flex-col bg-ep-surface border-r border-ep-border-subtle z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-ep-border-subtle">
        <div className="w-8 h-8 rounded-md bg-ep-accent flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-ep-base" strokeWidth={2.5} />
        </div>
        <span className="text-ep-primary font-semibold text-md tracking-tight">
          Rani<span className="text-ep-accent">Goods</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-ep-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-ep-accent/20 border border-ep-accent/30 flex items-center justify-center flex-shrink-0">
            <span className="text-ep-accent text-xs font-bold">R</span>
          </div>
          <div className="min-w-0">
            <p className="text-ep-primary text-xs font-medium truncate">RaniGoods</p>
            <p className="text-ep-muted text-xs truncate">Plano Pro</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
