'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity, LayoutGrid, List, Settings2, ShieldCheck,
  CheckCircle2, Circle, AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import PixelCard     from '@/components/pixels/PixelCard'
import EventsMatrix  from '@/components/pixels/EventsMatrix'
import PixelLogs     from '@/components/pixels/PixelLogs'
import type { PixelConfig, PixelPlatform } from '@/lib/types/pixel'

type Tab = 'pixels' | 'events' | 'advanced' | 'logs'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'pixels',   label: 'Pixels',    icon: LayoutGrid  },
  { id: 'events',   label: 'Eventos',   icon: List        },
  { id: 'advanced', label: 'Avançado',  icon: Settings2   },
  { id: 'logs',     label: 'Logs',      icon: Activity    },
]

const PLATFORM_LABELS: Record<PixelPlatform, string> = {
  meta:       'Meta Pixel',
  ga4:        'GA4',
  google_ads: 'Google Ads',
  tiktok:     'TikTok',
}

// ─── Summary chips ────────────────────────────────────────────────────────────

function SummaryChips({ pixels }: { pixels: PixelConfig[] }) {
  const active      = pixels.filter(p => p.enabled && p.pixelId)
  const misconfiged = pixels.filter(p => p.enabled && !p.pixelId)

  if (pixels.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {active.length > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-ep-success/10 border border-ep-success/20 text-ep-success text-xs font-medium">
          <CheckCircle2 size={10} />
          {active.length} ativo{active.length !== 1 ? 's' : ''}
        </span>
      )}
      {misconfiged.length > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-ep-warning/10 border border-ep-warning/20 text-ep-warning text-xs font-medium">
          <AlertCircle size={10} />
          {misconfiged.length} sem ID
        </span>
      )}
      {active.length === 0 && misconfiged.length === 0 && (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-ep-raised border border-ep-border-default text-ep-secondary text-xs">
          <Circle size={8} />
          Nenhum pixel ativo
        </span>
      )}
    </div>
  )
}

// ─── Advanced tab ─────────────────────────────────────────────────────────────

function AdvancedTab({ pixels }: { pixels: PixelConfig[] }) {
  const metaPixel = pixels.find(p => p.platform === 'meta')

  return (
    <div className="space-y-4">
      {/* CAPI status */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 space-y-4">
        <h3 className="text-ep-primary font-semibold text-sm">Status Server-Side (CAPI)</h3>
        <div className="space-y-3">
          {pixels.map(p => {
            const hasToken = !!p.accessToken
            return (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={clsx('text-xs', hasToken ? 'text-ep-success' : 'text-ep-muted')}>
                    {hasToken ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  </span>
                  <span className="text-ep-primary text-sm">{PLATFORM_LABELS[p.platform]}</span>
                </div>
                <span className={clsx('text-xs', hasToken ? 'text-ep-success' : 'text-ep-muted')}>
                  {hasToken ? 'Configurado' : 'Sem token'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deduplication */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 space-y-3">
        <h3 className="text-ep-primary font-semibold text-sm">Deduplicação de Eventos</h3>
        <p className="text-ep-secondary text-xs leading-relaxed">
          O RaniGoods usa <code className="bg-ep-raised px-1 rounded text-ep-accent">event_id</code> único
          em cada disparo para evitar contagem dupla quando client-side e server-side (CAPI) estão ambos
          ativos. Configure o mesmo <code className="bg-ep-raised px-1 rounded text-ep-accent">event_id</code>
          {' '}no pixel do browser para garantir a deduplicação correta.
        </p>
        {metaPixel?.testEventCode && (
          <div className="flex items-center gap-2 p-3 bg-ep-raised rounded-md border border-ep-border-default">
            <ShieldCheck size={14} className="text-ep-accent flex-shrink-0" />
            <p className="text-ep-secondary text-xs">
              Test Event Code Meta ativo:{' '}
              <code className="text-ep-accent font-mono">{metaPixel.testEventCode}</code>
            </p>
          </div>
        )}
      </div>

      {/* Privacy / compliance */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 space-y-3">
        <h3 className="text-ep-primary font-semibold text-sm">Privacidade e Conformidade</h3>
        <ul className="space-y-2 text-ep-secondary text-xs leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-ep-success mt-0.5 flex-shrink-0" />
            Dados de usuário (e-mail, telefone) são hasheados com SHA-256 antes de serem enviados à Meta CAPI
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-ep-success mt-0.5 flex-shrink-0" />
            O TikTok Events API também recebe apenas dados hasheados
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={12} className="text-ep-success mt-0.5 flex-shrink-0" />
            IPs e User-Agents são coletados apenas server-side via headers HTTP
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle size={12} className="text-ep-warning mt-0.5 flex-shrink-0" />
            Certifique-se de incluir os pixels no seu aviso de cookies conforme LGPD
          </li>
        </ul>
      </div>

      {/* Webhook integration info */}
      <div className="bg-ep-surface border border-ep-info/20 rounded-lg p-4 md:p-5">
        <p className="text-ep-info text-sm font-semibold mb-2">Integração automática via Stripe Webhook</p>
        <ul className="space-y-1.5 text-ep-secondary text-xs leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-ep-accent font-mono">→</span>
            <span><code className="bg-ep-raised px-1 rounded text-ep-accent">payment_intent.succeeded</code> dispara evento <strong>Purchase</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ep-accent font-mono">→</span>
            <span><code className="bg-ep-raised px-1 rounded text-ep-accent">customer.subscription.created</code> dispara evento <strong>Subscribe</strong></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ep-muted font-mono">→</span>
            <span className="text-ep-muted">Os demais eventos são disparados via client-side no frontend</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PixelsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('pixels')
  const [pixels,    setPixels]    = useState<PixelConfig[]>([])
  const [loading,   setLoading]   = useState(true)

  const fetchPixels = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/pixels')
    const data = await res.json() as PixelConfig[]
    setPixels(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPixels() }, [fetchPixels])

  const handleSave = async (id: string, data: Partial<PixelConfig>) => {
    const res = await fetch(`/api/pixels/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    const updated = await res.json() as PixelConfig
    setPixels(prev => prev.map(p => p.id === id ? updated : p))
  }

  const handleTest = async (id: string, event: string) => {
    await fetch(`/api/pixels/${id}/test`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ event }),
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Pixels de Rastreamento</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            Configure rastreamento avançado com CAPI server-side para maior precisão
          </p>
        </div>
        <SummaryChips pixels={pixels} />
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-px">
        <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1 w-fit min-w-full sm:min-w-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-1 sm:flex-none',
                activeTab === id
                  ? 'bg-ep-accent text-ep-base font-semibold'
                  : 'text-ep-secondary hover:text-ep-primary',
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-ep-surface border border-ep-border-subtle rounded-lg h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'pixels' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pixels.map(config => (
                <PixelCard
                  key={config.id}
                  config={config}
                  onSave={handleSave}
                  onTest={handleTest}
                />
              ))}
            </div>
          )}

          {activeTab === 'events' && (
            <EventsMatrix pixels={pixels} onSave={handleSave} />
          )}

          {activeTab === 'advanced' && (
            <AdvancedTab pixels={pixels} />
          )}

          {activeTab === 'logs' && (
            <PixelLogs />
          )}
        </>
      )}
    </div>
  )
}
