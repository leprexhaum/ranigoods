'use client'

import { useState } from 'react'
import { Check, Save } from 'lucide-react'
import clsx from 'clsx'
import type { PixelConfig, StandardEvent } from '@/lib/types/pixel'
import { STANDARD_EVENTS } from '@/lib/types/pixel'

const EVENT_DESCRIPTIONS: Record<StandardEvent, string> = {
  PageView:             'Visualização de página',
  ViewContent:          'Visualização de produto/conteúdo',
  AddToCart:            'Adição ao carrinho',
  InitiateCheckout:     'Início do checkout',
  AddPaymentInfo:       'Inserção de dados de pagamento',
  Purchase:             'Compra concluída',
  Lead:                 'Captura de lead',
  CompleteRegistration: 'Registro concluído',
  Subscribe:            'Nova assinatura',
  StartTrial:           'Início de período de teste',
  Search:               'Busca realizada',
}

const PLATFORM_LABELS: Record<string, string> = {
  meta:       'Meta',
  ga4:        'GA4',
  google_ads: 'G.Ads',
  tiktok:     'TikTok',
}

interface Props {
  pixels: PixelConfig[]
  onSave: (id: string, data: Partial<PixelConfig>) => Promise<void>
}

export default function EventsMatrix({ pixels, onSave }: Props) {
  const [configs, setConfigs] = useState<PixelConfig[]>(pixels)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  const toggle = (pixelId: string, event: StandardEvent) => {
    setConfigs(prev => prev.map(p => {
      if (p.id !== pixelId) return p
      return {
        ...p,
        events: p.events.map(e =>
          e.event === event ? { ...e, enabled: !e.enabled } : e,
        ),
      }
    }))
  }

  const isEnabled = (pixelId: string, event: StandardEvent): boolean => {
    return configs.find(p => p.id === pixelId)?.events.find(e => e.event === event)?.enabled ?? false
  }

  const handleSaveAll = async () => {
    setSaving(true)
    await Promise.all(configs.map(c => onSave(c.id, { events: c.events })))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-ep-border-subtle">
        <div>
          <h3 className="text-ep-primary font-semibold text-sm">Mapeamento de Eventos</h3>
          <p className="text-ep-secondary text-xs mt-0.5">Defina quais eventos são disparados em cada plataforma</p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
            saved
              ? 'bg-ep-success/20 border border-ep-success/30 text-ep-success'
              : 'bg-ep-accent text-ep-base hover:bg-ep-accent-dark',
          )}
        >
          {saved ? <Check size={12} /> : <Save size={12} />}
          {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ep-border-subtle">
              <th className="text-left px-4 py-3 text-ep-secondary text-xs font-medium w-48">Evento</th>
              {configs.map(p => (
                <th key={p.id} className="px-4 py-3 text-center text-xs font-medium" style={{ minWidth: 96 }}>
                  <div className={clsx('flex flex-col items-center gap-0.5', !p.enabled && 'opacity-40')}>
                    <span className="text-ep-primary font-semibold truncate max-w-[100px]">{p.name || PLATFORM_LABELS[p.platform]}</span>
                    <span className="text-ep-muted font-normal">{PLATFORM_LABELS[p.platform]}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ep-border-subtle">
            {STANDARD_EVENTS.map(event => (
              <tr key={event} className="hover:bg-ep-raised/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-ep-primary text-xs font-mono">{event}</p>
                  <p className="text-ep-muted text-xs">{EVENT_DESCRIPTIONS[event]}</p>
                </td>
                {configs.map(p => (
                  <td key={p.id} className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(p.id, event)}
                      disabled={!p.enabled}
                      className={clsx(
                        'w-5 h-5 rounded border flex items-center justify-center mx-auto transition-all',
                        isEnabled(p.id, event) && p.enabled
                          ? 'bg-ep-accent border-ep-accent text-ep-base'
                          : p.enabled
                            ? 'border-ep-border-default bg-ep-raised hover:border-ep-accent'
                            : 'border-ep-border-subtle bg-transparent opacity-30 cursor-not-allowed',
                      )}
                    >
                      {isEnabled(p.id, event) && <Check size={10} strokeWidth={3} />}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
