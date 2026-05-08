import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface PolicyLayoutProps {
  title: string
  updated: string
  children: React.ReactNode
}

export function PolicyLayout({ title, updated, children }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen bg-ep-base">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-ep-secondary hover:text-ep-accent transition-colors mb-10"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-ep-primary mb-3">{title}</h1>
          <p className="text-sm text-ep-muted">Última atualização: {updated}</p>
        </div>

        <div className="space-y-10 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ep-accent [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-ep-border-subtle [&_p]:text-ep-secondary [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_ul]:space-y-2 [&_ul]:mt-2 [&_ul]:mb-2 [&_li]:text-ep-secondary [&_li]:text-sm [&_li]:pl-4 [&_li]:relative [&_a]:text-ep-accent [&_a:hover]:text-ep-accent-light">
          {children}
        </div>
      </div>
    </div>
  )
}
