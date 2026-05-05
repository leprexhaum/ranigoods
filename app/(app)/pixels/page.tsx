'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Activity, LayoutGrid, List, Settings2,
  CheckCircle2, Circle, AlertCircle, Plus, Pencil, Trash2,
  ShieldCheck,
} from 'lucide-react'
import clsx from 'clsx'
import EventsMatrix  from '@/components/pixels/EventsMatrix'
import PixelLogs     from '@/components/pixels/PixelLogs'
import PixelModal    from '@/components/pixels/PixelModal'
import { PlatformIcon, PLATFORM_CONFIG, type Platform } from '@/components/pixels/PlatformIcon'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { TableSkeleton } from '@/components/ui/Skeleton'
import type { PixelConfig } from '@/lib/types/pixel'

type Tab = 'pixels' | 'events' | 'advanced' | 'logs'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'pixels',   label: 'Pixels',    icon: LayoutGrid  },
  { id: 'events',   label: 'Eventos',   icon: List        },
  { id: 'advanced', label: 'Avançado',  icon: Settings2   },
  { id: 'logs',     label: 'Logs',      icon: Activity    },
]

function StatusBadge({ enabled, pixelId }: { enabled: boolean; pixelId: string }) {
  if (!enabled)  return <span className="inline-flex items-center gap-1 text-ep-muted text-xs"><Circle size={8} /> Inativo</span>
  if (!pixelId)  return <span className="inline-flex items-center gap-1 text-ep-warning text-xs"><AlertCircle size={10} /> Sem ID</span>
  return <span className="inline-flex items-center gap-1 text-ep-success text-xs"><CheckCircle2 size={10} /> Ativo</span>
}

function SummaryChips({ pixels }: { pixels: PixelConfig[] }) {
  const active      = pixels.filter(p => p.enabled && p.pixelId)
  const misconfiged = pixels.filter(p => p.enabled && !p.pixelId)
  if (pixels.length === 0) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {active.length > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-ep-success/10 border border-ep-success/20 text-ep-success text-xs font-medium">
          <CheckCircle2 size={10} /> {active.length} ativo{active.length !== 1 ? 's' : ''}
        </span>
      )}
      {misconfiged.length > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-ep-warning/10 border border-ep-warning/20 text-ep-warning text-xs font-medium">
          <AlertCircle size={10} /> {misconfiged.length} sem ID
        </span>
      )}
    </div>
  )
}

function AdvancedTab({ pixels }: { pixels: PixelConfig[] }) {
  const metaPixel = pixels.find(p => p.platform === 'meta')
  return (
    <div className="space-y-4">
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 space-y-4">
        <h3 className="text-ep-primary font-semibold text-sm">Status Server-Side (CAPI)</h3>
        <div className="space-y-3">
          {pixels.length === 0 && <p className="text-ep-muted text-sm">Nenhum pixel configurado</p>}
          {pixels.map(p => {
            const hasToken = !!p.accessToken
            const cfg = PLATFORM_CONFIG[p.platform as Platform]
            return (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {cfg && <PlatformIcon platform={p.platform as Platform} size={14} className={cfg.iconColor} />}
                  <span className="text-ep-primary text-sm">{p.name || cfg?.label || p.platform}</span>
                </div>
                <span className={clsx('text-xs flex items-center gap-1', hasToken ? 'text-ep-success' : 'text-ep-muted')}>
                  {hasToken ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                  {hasToken ? 'CAPI configurado' : 'Sem token'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 space-y-3">
        <h3 className="text-ep-primary font-semibold text-sm">Deduplicação de Eventos</h3>
        <p className="text-ep-secondary text-xs leading-relaxed">
          O RaniGoods usa <code className="bg-ep-raised px-1 rounded text-ep-accent">event_id</code> único
          em cada disparo para evitar contagem dupla quando client-side e server-side (CAPI) estão ambos ativos.
        </p>
        {metaPixel?.testEventCode && (
          <div className="flex items-center gap-2 p-3 bg-ep-raised rounded-md border border-ep-border-default">
            <ShieldCheck size={14} className="text-ep-accent flex-shrink-0" />
            <p className="text-ep-secondary text-xs">
              Test Event Code Meta ativo: <code className="text-ep-accent font-mono">{metaPixel.testEventCode}</code>
            </p>
          </div>
        )}
      </div>

      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 space-y-3">
        <h3 className="text-ep-primary font-semibold text-sm">Privacidade e Conformidade</h3>
        <ul className="space-y-2 text-ep-secondary text-xs leading-relaxed">
          {[
            { ok: true,  text: 'Dados de usuário (e-mail, telefone) são hasheados com SHA-256 antes de serem enviados à Meta CAPI' },
            { ok: true,  text: 'O TikTok Events API também recebe apenas dados hasheados' },
            { ok: true,  text: 'IPs e User-Agents são coletados apenas server-side via headers HTTP' },
            { ok: false, text: 'Certifique-se de incluir os pixels no seu aviso de cookies conforme LGPD' },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              {item.ok
                ? <CheckCircle2 size={12} className="text-ep-success mt-0.5 flex-shrink-0" />
                : <AlertCircle  size={12} className="text-ep-warning mt-0.5 flex-shrink-0" />}
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-ep-surface border border-ep-info/20 rounded-lg p-4 md:p-5">
        <p className="text-ep-info text-sm font-semibold mb-2">Integração automática via Stripe Webhook</p>
        <ul className="space-y-1.5 text-ep-secondary text-xs leading-relaxed">
          <li className="flex items-start gap-2"><span className="text-ep-accent font-mono">→</span><span><code className="bg-ep-raised px-1 rounded text-ep-accent">payment_intent.succeeded</code> dispara evento <strong>Purchase</strong></span></li>
          <li className="flex items-start gap-2"><span className="text-ep-accent font-mono">→</span><span><code className="bg-ep-raised px-1 rounded text-ep-accent">checkout.session.completed</code> (carrinho) dispara evento <strong>Purchase</strong></span></li>
          <li className="flex items-start gap-2"><span className="text-ep-muted font-mono">→</span><span className="text-ep-muted">Os demais eventos são disparados via client-side no frontend</span></li>
        </ul>
      </div>
    </div>
  )
}

export default function PixelsPage() {
  const [activeTab,    setActiveTab]    = useState<Tab>('pixels')
  const [pixels,       setPixels]       = useState<PixelConfig[]>([])
  const [loading,      setLoading]      = useState(true)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editingPixel, setEditingPixel] = useState<PixelConfig | null>(null)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const { confirmProps, confirm }       = useConfirm()

  const fetchPixels = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/pixels')
    const data = await res.json() as PixelConfig[]
    setPixels(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchPixels() }, [fetchPixels])

  const handleOpenCreate = () => { setEditingPixel(null); setModalOpen(true) }
  const handleOpenEdit   = (p: PixelConfig) => { setEditingPixel(p); setModalOpen(true) }

  const handleSave = async (data: Partial<PixelConfig> & { platform?: string }) => {
    if (editingPixel) {
      await fetch(`/api/pixels/${editingPixel.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
    } else {
      await fetch('/api/pixels', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
    }
    await fetchPixels()
  }

  const handleTest = async (id: string, event: string) => {
    const res  = await fetch(`/api/pixels/${id}/test`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ event }),
    })
    return res.json() as Promise<{ success: boolean; message: string }>
  }

  const handleDelete = async (id: string) => {
    confirm({
      title:       'Apagar pixel',
      message:     'Este pixel será removido de todos os produtos associados. Esta ação não pode ser desfeita.',
      confirmText: 'Apagar',
      variant:     'danger',
      onConfirm:   async () => {
        setDeleting(id)
        await fetch(`/api/pixels/${id}`, { method: 'DELETE' })
        await fetchPixels()
        setDeleting(null)
      },
    })
  }

  const handleEventsave = async (id: string, data: Partial<PixelConfig>) => {
    const res     = await fetch(`/api/pixels/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    const updated = await res.json() as PixelConfig
    setPixels(prev => prev.map(p => p.id === id ? updated : p))
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
        <div className="flex items-center gap-3">
          <SummaryChips pixels={pixels} />
          {activeTab === 'pixels' && (
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-3 py-2 bg-ep-accent text-ep-base rounded-md text-sm font-medium hover:bg-ep-accent/90 transition-colors whitespace-nowrap"
            >
              <Plus size={14} /> Adicionar Pixel
            </button>
          )}
        </div>
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
                activeTab === id ? 'bg-ep-accent text-ep-base font-semibold' : 'text-ep-secondary hover:text-ep-primary',
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Pixels — tabela */}
      {activeTab === 'pixels' && (
        <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
          {loading ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody><TableSkeleton rows={4} cols={6} widths={['120px','140px','120px','100px','80px','60px']} /></tbody>
              </table>
            </div>
          ) : pixels.length === 0 ? (
            <div className="px-5 py-14 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-ep-raised border border-ep-border-default flex items-center justify-center mx-auto">
                <LayoutGrid size={20} className="text-ep-muted" />
              </div>
              <p className="text-ep-primary font-medium text-sm">Nenhum pixel criado</p>
              <p className="text-ep-muted text-xs">Clique em "Adicionar Pixel" para começar a rastrear conversões</p>
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-ep-accent text-ep-base rounded-md text-sm font-medium hover:bg-ep-accent/90 transition-colors"
              >
                <Plus size={14} /> Adicionar Pixel
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ep-border-subtle">
                    {['Plataforma', 'Nome', 'Pixel ID', 'Server-side', 'Status', 'Ações'].map(h => (
                      <th key={h} className="text-left text-ep-muted text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pixels.map(p => {
                    const cfg = PLATFORM_CONFIG[p.platform as Platform]
                    return (
                      <tr key={p.id} className="border-b border-ep-border-subtle last:border-0 hover:bg-ep-raised/40 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={clsx('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', cfg?.bg, 'border', cfg?.border)}>
                              {cfg && <PlatformIcon platform={p.platform as Platform} size={14} className={cfg.iconColor} />}
                            </div>
                            <span className="text-ep-secondary text-xs font-medium whitespace-nowrap">{cfg?.label ?? p.platform}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-ep-primary text-sm">{p.name || <span className="text-ep-muted italic">Sem nome</span>}</span>
                        </td>
                        <td className="px-5 py-3">
                          <code className="text-ep-secondary text-xs font-mono">
                            {p.pixelId ? `${p.pixelId.slice(0, 12)}${p.pixelId.length > 12 ? '…' : ''}` : <span className="text-ep-muted">—</span>}
                          </code>
                        </td>
                        <td className="px-5 py-3">
                          {p.accessToken
                            ? <span className="inline-flex items-center gap-1 text-ep-success text-xs"><CheckCircle2 size={10} /> Configurado</span>
                            : <span className="text-ep-muted text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge enabled={p.enabled} pixelId={p.pixelId} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded hover:bg-ep-raised text-ep-muted hover:text-ep-primary transition-colors"
                              title="Editar"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deleting === p.id}
                              className="p-1.5 rounded hover:bg-ep-danger/10 text-ep-muted hover:text-ep-danger transition-colors disabled:opacity-40"
                              title="Apagar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'events'   && <EventsMatrix pixels={pixels} onSave={handleEventsave} />}
      {activeTab === 'advanced' && <AdvancedTab  pixels={pixels} />}
      {activeTab === 'logs'     && <PixelLogs />}

      <PixelModal
        open={modalOpen}
        pixel={editingPixel}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onTest={handleTest}
      />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
