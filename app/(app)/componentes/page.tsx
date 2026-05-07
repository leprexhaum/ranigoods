'use client'

import { useState } from 'react'
import {
  CreditCard, TrendingUp, ShoppingBag, Users,
  AlertTriangle, Package, Zap,
} from 'lucide-react'
import type { DailySale } from '@/lib/types/dashboard'

// UI
import { Toggle }                                    from '@/components/ui/Toggle'
import { ConfirmDialog }                             from '@/components/ui/ConfirmDialog'
import DateFilter, { type DatePreset }               from '@/components/ui/DateFilter'
import DualAmount                                    from '@/components/ui/DualAmount'
import {
  Skeleton,
  TableRowSkeleton,
  ProductCardSkeleton,
  ListRowSkeleton,
} from '@/components/ui/Skeleton'

// Dashboard
import StatsCard   from '@/components/dashboard/StatsCard'
import SalesChart  from '@/components/dashboard/SalesChart'
import StatusChart from '@/components/dashboard/StatusChart'

// Icons
import { MetaIcon, GA4Icon, GoogleAdsIcon, TikTokIcon } from '@/components/icons'
import { PlatformIcon }                                  from '@/components/pixels/PlatformIcon'

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="border-b border-ep-border-subtle pb-3">
        <h2 className="text-ep-primary font-bold text-base">{title}</h2>
        {description && <p className="text-ep-muted text-xs mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-ep-secondary text-xs font-medium font-mono">{label}</p>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </div>
  )
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockSalesData: DailySale[] = [
  { date: '01/05', isoDate: '2026-05-01', receita: 120000, vendas: 4, falhas: 1 },
  { date: '02/05', isoDate: '2026-05-02', receita: 85000,  vendas: 3, falhas: 0 },
  { date: '03/05', isoDate: '2026-05-03', receita: 210000, vendas: 7, falhas: 2 },
  { date: '04/05', isoDate: '2026-05-04', receita: 175000, vendas: 6, falhas: 1 },
  { date: '05/05', isoDate: '2026-05-05', receita: 310000, vendas: 9, falhas: 0 },
  { date: '06/05', isoDate: '2026-05-06', receita: 95000,  vendas: 3, falhas: 1 },
  { date: '07/05', isoDate: '2026-05-07', receita: 260000, vendas: 8, falhas: 2 },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComponentesPage() {
  const [toggle1,      setToggle1]      = useState(true)
  const [toggle2,      setToggle2]      = useState(false)
  const [confirmOpen,  setConfirmOpen]  = useState(false)
  const [confirmWarn,  setConfirmWarn]  = useState(false)
  const [datePreset,   setDatePreset]   = useState<DatePreset>('7d')
  const [customStart,  setCustomStart]  = useState('')
  const [customEnd,    setCustomEnd]    = useState('')

  return (
    <div className="p-6 space-y-12 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-ep-primary text-xl font-bold flex items-center gap-2">
          <Zap size={20} className="text-ep-accent" />
          Design System — Componentes
        </h1>
        <p className="text-ep-secondary text-sm mt-1">
          Todos os componentes reutilizáveis do projeto, com exemplos ao vivo.
        </p>
      </div>

      {/* ── Toggle ── */}
      <Section title="Toggle" description="components/ui/Toggle.tsx">
        <Row label="checked=true">
          <Toggle checked={toggle1} onChange={setToggle1} label="Toggle ativo" />
          <span className="text-ep-muted text-xs">{toggle1 ? 'ligado' : 'desligado'}</span>
        </Row>
        <Row label="checked=false">
          <Toggle checked={toggle2} onChange={setToggle2} label="Toggle inativo" />
          <span className="text-ep-muted text-xs">{toggle2 ? 'ligado' : 'desligado'}</span>
        </Row>
        <Row label="disabled">
          <Toggle checked={true}  onChange={() => {}} disabled label="Disabled on"  />
          <Toggle checked={false} onChange={() => {}} disabled label="Disabled off" />
        </Row>
      </Section>

      {/* ── ConfirmDialog ── */}
      <Section title="ConfirmDialog" description="components/ui/ConfirmDialog.tsx">
        <Row label="variant=danger">
          <button
            onClick={() => setConfirmOpen(true)}
            className="px-4 py-2 bg-ep-danger text-white text-sm rounded-md hover:opacity-90 transition-opacity"
          >
            Abrir dialog danger
          </button>
        </Row>
        <Row label="variant=warning">
          <button
            onClick={() => setConfirmWarn(true)}
            className="px-4 py-2 bg-ep-warning text-ep-base text-sm rounded-md hover:opacity-90 transition-opacity"
          >
            Abrir dialog warning
          </button>
        </Row>
        <ConfirmDialog
          open={confirmOpen}
          title="Excluir item"
          message="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          variant="danger"
          onConfirm={() => setConfirmOpen(false)}
          onCancel={() => setConfirmOpen(false)}
        />
        <ConfirmDialog
          open={confirmWarn}
          title="Atenção"
          message="Esta ação pode afetar outros registros. Deseja continuar?"
          confirmText="Continuar"
          variant="warning"
          onConfirm={() => setConfirmWarn(false)}
          onCancel={() => setConfirmWarn(false)}
        />
      </Section>

      {/* ── DateFilter ── */}
      <Section title="DateFilter" description="components/ui/DateFilter.tsx">
        <Row label="preset padrão">
          <DateFilter
            preset={datePreset}
            customStart={customStart}
            customEnd={customEnd}
            onChange={(p, s, e) => { setDatePreset(p); setCustomStart(s ?? ''); setCustomEnd(e ?? '') }}
          />
          <span className="text-ep-muted text-xs font-mono">preset: {datePreset}</span>
        </Row>
      </Section>

      {/* ── DualAmount ── */}
      <Section title="DualAmount" description="components/ui/DualAmount.tsx — exibe EUR + BRL">
        <Row label="size=sm">
          <DualAmount eurCents={1999}   size="sm" />
          <DualAmount eurCents={9900}   size="sm" />
          <DualAmount eurCents={149900} size="sm" />
        </Row>
        <Row label="size=md (default)">
          <DualAmount eurCents={1999}   />
          <DualAmount eurCents={9900}   />
          <DualAmount eurCents={149900} />
        </Row>
        <Row label="size=lg">
          <DualAmount eurCents={1999}   size="lg" />
          <DualAmount eurCents={9900}   size="lg" />
          <DualAmount eurCents={149900} size="lg" />
        </Row>
      </Section>

      {/* ── Skeleton ── */}
      <Section title="Skeleton" description="components/ui/Skeleton.tsx">
        <Row label="Skeleton (base)">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </Row>
        <Row label="ListRowSkeleton">
          <div className="w-full border border-ep-border-default rounded-lg overflow-hidden">
            <ListRowSkeleton cols={3} />
            <ListRowSkeleton cols={3} />
          </div>
        </Row>
        <Row label="ProductCardSkeleton">
          <div className="w-72">
            <ProductCardSkeleton />
          </div>
        </Row>
        <Row label="TableRowSkeleton">
          <div className="w-full border border-ep-border-default rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody>
                <TableRowSkeleton cols={4} />
                <TableRowSkeleton cols={4} />
              </tbody>
            </table>
          </div>
        </Row>
      </Section>

      {/* ── StatsCard ── */}
      <Section title="StatsCard" description="components/dashboard/StatsCard.tsx">
        <Row label="accent variants">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
            <StatsCard title="Receita"    value="€ 3.120,00" subValue="R$ 18.720,00" change={12.4}  changeLabel="vs mês anterior" icon={CreditCard}  accent="default" />
            <StatsCard title="Vendas"     value="42"          change={8.1}            changeLabel="vs mês anterior" icon={ShoppingBag} accent="success" />
            <StatsCard title="Falhas"     value="3"           change={-25}            changeLabel="vs mês anterior" icon={AlertTriangle} accent="danger" />
            <StatsCard title="Clientes"   value="38"          change={5.2}            changeLabel="vs mês anterior" icon={Users}       accent="info"    />
            <StatsCard title="Produtos"   value="7"           icon={Package}          accent="warning" />
            <StatsCard title="Carregando" value="—"           icon={TrendingUp}       loading={true}   />
          </div>
        </Row>
      </Section>

      {/* ── SalesChart ── */}
      <Section title="SalesChart" description="components/dashboard/SalesChart.tsx">
        <SalesChart data={mockSalesData} />
      </Section>

      {/* ── StatusChart ── */}
      <Section title="StatusChart" description="components/dashboard/StatusChart.tsx">
        <div className="max-w-sm">
          <StatusChart vendas={42} falhas={8} pendentes={5} reembolsos={3} />
        </div>
      </Section>

      {/* ── Platform Icons ── */}
      <Section title="Platform Icons" description="components/icons/ + components/pixels/PlatformIcon.tsx">
        <Row label="Ícones SVG diretos">
          <MetaIcon      style={{ width: 32, height: 32 }} />
          <GA4Icon       style={{ width: 32, height: 32 }} />
          <GoogleAdsIcon style={{ width: 32, height: 32 }} />
          <TikTokIcon    style={{ width: 32, height: 32 }} />
        </Row>
        <Row label="PlatformIcon size=16">
          <PlatformIcon platform="meta"       size={16} />
          <PlatformIcon platform="ga4"        size={16} />
          <PlatformIcon platform="google_ads" size={16} />
          <PlatformIcon platform="tiktok"     size={16} />
        </Row>
        <Row label="PlatformIcon size=32">
          <PlatformIcon platform="meta"       size={32} />
          <PlatformIcon platform="ga4"        size={32} />
          <PlatformIcon platform="google_ads" size={32} />
          <PlatformIcon platform="tiktok"     size={32} />
        </Row>
      </Section>
    </div>
  )
}
