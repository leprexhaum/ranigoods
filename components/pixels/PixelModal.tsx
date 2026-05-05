'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, X, ChevronLeft, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import type { PixelConfig } from '@/lib/types/pixel'
import { STANDARD_EVENTS } from '@/lib/types/pixel'
import { PlatformIcon, PLATFORM_CONFIG, type Platform } from './PlatformIcon'

const PLATFORMS: Platform[] = ['meta', 'ga4', 'google_ads', 'tiktok']

interface Props {
  open:    boolean
  pixel?:  PixelConfig | null   // null = criar, PixelConfig = editar
  onClose: () => void
  onSave:  (data: Partial<PixelConfig> & { platform?: string }) => Promise<void>
  onTest?: (id: string, event: string) => Promise<{ success: boolean; message: string }>
}

export default function PixelModal({ open, pixel, onClose, onSave, onTest }: Props) {
  const isEdit = !!pixel

  const [step,            setStep]            = useState<'platform' | 'fields'>(isEdit ? 'fields' : 'platform')
  const [platform,        setPlatform]        = useState<Platform | null>((pixel?.platform as Platform) ?? null)
  const [name,            setName]            = useState(pixel?.name            ?? '')
  const [pixelId,         setPixelId]         = useState(pixel?.pixelId         ?? '')
  const [accessToken,     setAccessToken]     = useState(pixel?.accessToken     ?? '')
  const [testEventCode,   setTestEventCode]   = useState(pixel?.testEventCode   ?? '')
  const [conversionLabel, setConversionLabel] = useState(pixel?.conversionLabel ?? '')
  const [enabled,         setEnabled]         = useState(pixel?.enabled         ?? true)
  const [showToken,       setShowToken]       = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [testEvent,       setTestEvent]       = useState('Purchase')
  const [testing,         setTesting]         = useState(false)
  const [testResult,      setTestResult]      = useState<{ success: boolean; message: string } | null>(null)

  // Reset ao abrir
  useEffect(() => {
    if (!open) return
    setStep(isEdit ? 'fields' : 'platform')
    setPlatform((pixel?.platform as Platform) ?? null)
    setName(pixel?.name            ?? '')
    setPixelId(pixel?.pixelId      ?? '')
    setAccessToken(pixel?.accessToken ?? '')
    setTestEventCode(pixel?.testEventCode ?? '')
    setConversionLabel(pixel?.conversionLabel ?? '')
    setEnabled(pixel?.enabled ?? true)
    setShowToken(false)
    setTestResult(null)
  }, [open, pixel, isEdit])

  if (!open) return null

  const meta = platform ? PLATFORM_CONFIG[platform] : null

  async function handleSave() {
    if (!platform) return
    setSaving(true)
    try {
      await onSave({
        platform,
        name:            name.trim(),
        pixelId:         pixelId.trim(),
        accessToken:     accessToken.trim(),
        testEventCode:   testEventCode.trim(),
        conversionLabel: conversionLabel.trim(),
        enabled,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!pixel || !onTest) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await onTest(pixel.id, testEvent)
      setTestResult(res)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-ep-surface border border-ep-border-default rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ep-border-subtle">
          <div className="flex items-center gap-2">
            {step === 'fields' && !isEdit && (
              <button onClick={() => setStep('platform')} className="text-ep-muted hover:text-ep-primary transition-colors">
                <ChevronLeft size={16} />
              </button>
            )}
            {platform && meta && (
              <div className={clsx('w-7 h-7 rounded-md flex items-center justify-center', meta.bg, meta.border, 'border')}>
                <PlatformIcon platform={platform} size={14} />
              </div>
            )}
            <h2 className="text-ep-primary font-semibold text-sm">
              {isEdit ? `Editar ${meta?.label ?? 'Pixel'}` : step === 'platform' ? 'Escolher plataforma' : `Novo ${meta?.label ?? 'Pixel'}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-ep-muted hover:text-ep-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Passo 1 — escolher plataforma */}
          {step === 'platform' && (
            <div className="grid grid-cols-2 gap-3">
              {PLATFORMS.map(p => {
                const cfg = PLATFORM_CONFIG[p]
                return (
                  <button
                    key={p}
                    onClick={() => { setPlatform(p); setStep('fields') }}
                    className={clsx(
                      'flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all hover:scale-[1.02]',
                      cfg.bg, cfg.border,
                    )}
                  >
                    <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg, 'border', cfg.border)}>
                      <PlatformIcon platform={p} size={22} />
                    </div>
                    <span className="text-ep-primary text-xs font-semibold text-center leading-tight">{cfg.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Passo 2 — campos */}
          {step === 'fields' && meta && (
            <div className="space-y-3">
              {/* Nome */}
              <div className="space-y-1">
                <label className="text-ep-secondary text-xs font-medium">Nome (identificação interna)</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Meta Principal, TikTok Loja A"
                  className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
                  autoFocus
                />
              </div>

              {/* Pixel ID */}
              <div className="space-y-1">
                <label className="text-ep-secondary text-xs font-medium">{meta.idLabel}</label>
                <input
                  type="text"
                  value={pixelId}
                  onChange={e => setPixelId(e.target.value)}
                  placeholder={meta.idPlaceholder}
                  className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
                />
              </div>

              {/* Access Token */}
              <div className="space-y-1">
                <label className="text-ep-secondary text-xs font-medium">{meta.tokenLabel} <span className="text-ep-muted">(opcional — server-side)</span></label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={accessToken}
                    onChange={e => setAccessToken(e.target.value)}
                    placeholder={meta.tokenPlaceholder}
                    className="w-full px-3 py-2 pr-9 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ep-muted hover:text-ep-secondary transition-colors"
                  >
                    {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
                <p className="text-ep-muted text-xs">Com token configurado, eventos são disparados server-side (CAPI) para maior precisão</p>
              </div>

              {/* Test Event Code — só Meta */}
              {meta.hasTestCode && (
                <div className="space-y-1">
                  <label className="text-ep-secondary text-xs font-medium">Test Event Code <span className="text-ep-muted">(opcional)</span></label>
                  <input
                    type="text"
                    value={testEventCode}
                    onChange={e => setTestEventCode(e.target.value)}
                    placeholder="Ex: TEST12345"
                    className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
                  />
                  <p className="text-ep-muted text-xs">Encontre em Meta → Events Manager → Test Events</p>
                </div>
              )}

              {/* Conversion Label — só Google Ads */}
              {meta.hasConvLabel && (
                <div className="space-y-1">
                  <label className="text-ep-secondary text-xs font-medium">Conversion Label</label>
                  <input
                    type="text"
                    value={conversionLabel}
                    onChange={e => setConversionLabel(e.target.value)}
                    placeholder="Ex: AbCd1234XYZ"
                    className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
                  />
                </div>
              )}

              {/* Toggle ativo */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-ep-primary text-sm font-medium">Pixel ativo</p>
                  <p className="text-ep-muted text-xs">Pixels inativos não disparam eventos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(v => !v)}
                  className={clsx(
                    'relative w-10 h-5 rounded-full transition-colors',
                    enabled ? 'bg-ep-accent' : 'bg-ep-border-default',
                  )}
                >
                  <span className={clsx(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                    enabled ? 'translate-x-5' : 'translate-x-0.5',
                  )} />
                </button>
              </div>

              {/* Testar evento — só em edição */}
              {isEdit && onTest && (
                <div className="pt-2 border-t border-ep-border-subtle space-y-2">
                  <p className="text-ep-secondary text-xs font-medium">Testar evento server-side</p>
                  <div className="flex gap-2">
                    <select
                      value={testEvent}
                      onChange={e => setTestEvent(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary text-xs focus:outline-none focus:border-ep-accent"
                    >
                      {STANDARD_EVENTS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <button
                      onClick={handleTest}
                      disabled={testing || !pixelId}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary hover:text-ep-accent hover:border-ep-accent text-xs transition-colors disabled:opacity-40 whitespace-nowrap"
                    >
                      <Zap size={11} className={testing ? 'animate-pulse' : ''} />
                      {testing ? 'Testando…' : 'Testar'}
                    </button>
                  </div>
                  {testResult && (
                    <p className={clsx('text-xs flex items-start gap-1.5', testResult.success ? 'text-ep-success' : 'text-ep-danger')}>
                      {testResult.success
                        ? <CheckCircle2 size={11} className="mt-0.5 flex-shrink-0" />
                        : <AlertCircle  size={11} className="mt-0.5 flex-shrink-0" />}
                      {testResult.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'fields' && (
          <div className="flex gap-2 justify-end px-5 py-4 border-t border-ep-border-subtle">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-ep-border-default text-ep-secondary text-sm hover:text-ep-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !platform}
              className="px-4 py-2 rounded-md bg-ep-accent text-ep-base text-sm font-medium hover:bg-ep-accent/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar pixel'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
