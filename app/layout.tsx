import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TechPags — Gestão de Pagamentos',
  description: 'Plataforma de gestão de pagamentos integrada com Stripe',
  icons: {
    icon:     '/favicon.png',
    apple:    '/favicon.png',
    shortcut: '/favicon.png',
  },
  openGraph: {
    title:       'TechPags — Gestão de Pagamentos',
    description: 'Plataforma de gestão de pagamentos integrada com Stripe',
    images:      [{ url: '/socialmediapreview.png', width: 1200, height: 630 }],
    type:        'website',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'TechPags — Gestão de Pagamentos',
    description: 'Plataforma de gestão de pagamentos integrada com Stripe',
    images:      ['/socialmediapreview.png'],
  },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ep-base text-ep-primary antialiased">
        {children}
      </body>
    </html>
  )
}
