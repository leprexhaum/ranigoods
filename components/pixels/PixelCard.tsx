'use client'

import { useState, useEffect } from 'react'
import {
  Eye, EyeOff, Copy, Check, ChevronDown, ChevronUp,
  Zap, AlertCircle, CheckCircle2, Circle, Lock,
} from 'lucide-react'
import clsx from 'clsx'
import type { PixelConfig, PixelPlatform } from '@/lib/types/pixel'
import { STANDARD_EVENTS } from '@/lib/types/pixel'

// ─── Platform meta ────────────────────────────────────────────────────────────

const PLATFORM_META: Record<PixelPlatform, {
  color: string; bg: string; border: string; label: string; abbr: string
  idLabel: string; idPlaceholder: string
  tokenLabel: string; tokenPlaceholder: string
  hasTestCode: boolean; hasConvLabel: boolean
}> = {
  meta: {
    color: '#4488ff', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
    label: 'Meta Pixel', abbr: 'M',
    idLabel: 'Pixel ID', idPlaceholder: 'Ex: 1234567890',
    tokenLabel: 'Access Token (CAPI)', tokenPlaceholder: 'EAAN...',
    hasTestCode: true, hasConvLabel: false,
  },
  ga4: {
    color: '#aaff00', bg: 'bg-ep-accent/10', border: 'border-ep-accent/20',
    label: 'Google Analytics 4', abbr: 'G4',
    idLabel: 'Measurement ID', idPlaceholder: 'Ex: G-XXXXXXXXXX',
    tokenLabel: 'API Secret (Measurement Protocol)', tokenPlaceholder: 'xxxxxxxxxxxxxx',
    hasTestCode: false, hasConvLabel: false,
  },
  google_ads: {
    color: '#ffaa00', bg: 'bg-ep-warning/10', border: 'border-ep-warning/20',
    label: 'Google Ads', abbr: 'GA',
    idLabel: 'Conversion ID', idPlaceholder: 'Ex: AW-XXXXXXXXXX',
    tokenLabel: 'API Secret', tokenPlaceholder: 'xxxxxxxxxxxxxx',
    hasTestCode: false, hasConvLabel: true,
  },
  tiktok: {
    color: '#ff4444', bg: 'bg-ep-danger/10', border: 'border-ep-danger/20',
    label: 'TikTok Pixel', abbr: 'TT',
    idLabel: 'Pixel ID', idPlaceholder: 'Ex: C4XXXXXXXXXXXXXXXX',
    tokenLabel: 'Access Token (Events API)', tokenPlaceholder: 'xxxxxxxxxxxxxx',
    hasTestCode: false, hasConvLabel: false,
  },
}

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ enabled, pixelId }: { enabled: boolean; pixelId: string }) {
  if (!enabled)  return <span className="flex items-center gap-1 text-ep-muted text-xs"><Circle size={8} /> Inativo</span>
  if (!pixelId)  return <span className="flex items-center gap-1 text-ep-warning text-xs"><AlertCircle size={10} /> Sem ID</span>
  return <span className="flex items-center gap-1 text-ep-success text-xs"><CheckCircle2 size={10} /> Ativo</span>
}

// ─── Code snippet ─────────────────────────────────────────────────────────────

function buildSnippet(platform: PixelPlatform, pixelId: string): string {
  const id = pixelId || 'SEU_ID_AQUI'
  switch (platform) {
    case 'meta': return `<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');
</script>`
    case 'ga4': return `<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`
    case 'google_ads': return `<!-- Google Ads Conversions -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`
    case 'tiktok': return `<!-- TikTok Pixel -->
<script>
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.load('${id}');ttq.page();
}(window,document,'ttq');
</script>`
  }
}

// ─── SecretField ──────────────────────────────────────────────────────────────

function SecretField({
  label, value, placeholder, onChange,
}: { label: string; value: string; placeholder: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div>
      <label className="text-ep-secondary text-xs block mb-1">{label}</label>
      <div className="relative flex items-center">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-3 pr-16 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-xs font-mono placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button onClick={copy} className="p-1 text-ep-muted hover:text-ep-accent transition-colors">
              {copied ? <Check size={11} className="text-ep-success" /> : <Copy size={11} />}
            </button>
          )}
          <button onClick={() => setShow(s => !s)} className="p-1 text-ep-muted hover:text-ep-accent transition-colors">
            {show ? <EyeOff size={11} /> : <Eye size={11} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PixelCard ────────────────────────────────────────────────────────────────

interface Props {
  config: PixelConfig
  onSave: (id: string, data: Partial<PixelConfig>) => Promise<void>
  onTest: (id: string, event: string) => Promise<void>
}

export default function PixelCard({ config, onSave, onTest }: Props) {
  const meta = PLATFORM_META[config.platform]

  // Estado local — sincroniza sempre que o config vindo do banco muda
  const [pixelId,       setPixelId]       = useState(config.pixelId)
  const [accessToken,   setAccessToken]   = useState(config.accessToken)
  const [testEventCode, setTestEventCode] = useState(config.testEventCode)
  const [convLabel,     setConvLabel]     = useState(config.conversionLabel)
  const [enabled,       setEnabled]       = useState(config.enabled)

  const [showAdvanced,  setShowAdvanced]  = useState(false)
  const [showSnippet,   setShowSnippet]   = useState(false)
  const [testEvent,     setTestEvent]     = useState('Purchase')
  const [testing,       setTesting]       = useState(false)
  const [testResult,    setTestResult]    = useState<{ success: boolean; message: string } | null>(null)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [toggleError,   setToggleError]   = useState('')

  // Sincroniza estado local quando o banco atualiza (pai faz refetch)
  useEffect(() => {
    setPixelId(config.pixelId)
    setAccessToken(config.accessToken)
    setTestEventCode(config.testEventCode)
    setConvLabel(config.conversionLabel)
    setEnabled(config.enabled)
  }, [config])

  const pixelIdTrimmed = pixelId.trim()
  // O toggle só pode ativar se tiver Pixel ID preenchido
  const canEnable = !!pixelIdTrimmed

  const snippet = buildSnippet(config.platform, pixelId)

  const handleToggle = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    const next = e ? e.target.checked : !enabled

    // Bloqueia ativação sem Pixel ID
    if (next && !canEnable) {
      setToggleError(`Preencha o ${meta.idLabel} antes de ativar`)
      setTimeout(() => setToggleError(''), 3500)
      return
    }

    // Atualiza UI imediatamente (optimistic)
    setEnabled(next)
    setToggleError('')

    try {
      await onSave(config.id, {
        enabled:          next,
        pixelId:          pixelIdTrimmed,
        accessToken,
        testEventCode,
        conversionLabel:  convLabel,
      })
    } catch {
      // Reverte se o save falhar
      setEnabled(!next)
      setToggleError('Erro ao salvar. Tente novamente.')
      setTimeout(() => setToggleError(''), 3500)
    }
  }

  const handleSave = async () => {
    // Se está ativado mas pixelId foi apagado, força desativar
    const willBeEnabled = enabled && !!pixelIdTrimmed

    setSaving(true)
    try {
      await onSave(config.id, {
        enabled:         willBeEnabled,
        pixelId:         pixelIdTrimmed,
        accessToken,
        testEventCode,
        conversionLabel: convLabel,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    await onTest(config.id, testEvent)
    setTestResult({ success: true, message: 'Evento disparado — verifique o painel da plataforma' })
    setTesting(false)
    setTimeout(() => setTestResult(null), 5000)
  }

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet)
    setSnippetCopied(true)
    setTimeout(() => setSnippetCopied(false), 2000)
  }

  return (
    <div className={clsx(
      'bg-ep-surface border rounded-lg transition-colors flex flex-col',
      enabled && pixelIdTrimmed ? 'border-ep-border-default' : 'border-ep-border-subtle',
    )}>
      {/* ── Header ── */}
      <div className="flex items-start justify-between p-4 md:p-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold', meta.bg, 'border', meta.border)}
            style={{ color: meta.color }}
          >
            {meta.abbr}
          </div>
          <div className="min-w-0">
            <h3 className="text-ep-primary text-sm font-semibold">{meta.label}</h3>
            <StatusChip enabled={enabled} pixelId={pixelIdTrimmed} />
          </div>
        </div>

        {/* Toggle + bloqueio visual */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <label
            className={clsx(
              'relative inline-flex items-center flex-shrink-0',
              canEnable || enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
            )}
            title={!canEnable && !enabled ? `Preencha o ${meta.idLabel} para ativar` : undefined}
          >
            <input
              type="checkbox"
              className="sr-only peer"
              checked={enabled}
              disabled={!canEnable && !enabled}
              onChange={handleToggle}
            />
            <div className="w-9 h-5 bg-ep-overlay rounded-full peer peer-checked:bg-ep-accent transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-ep-base rounded-full transition-all peer-checked:translate-x-4" />
          </label>

          {/* Ícone de cadeado quando não pode ativar */}
          {!canEnable && !enabled && (
            <span className="flex items-center gap-1 text-ep-muted text-xs">
              <Lock size={9} /> requer ID
            </span>
          )}
        </div>
      </div>

      {/* ── Erro do toggle ── */}
      {toggleError && (
        <div className="mx-4 md:mx-5 -mt-1 mb-2 flex items-center gap-1.5 px-3 py-2 bg-ep-warning/10 border border-ep-warning/20 rounded-md">
          <AlertCircle size={12} className="text-ep-warning flex-shrink-0" />
          <p className="text-ep-warning text-xs">{toggleError}</p>
        </div>
      )}

      {/* ── Body ── */}
      <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-3 flex-1">
        <div>
          <label className="text-ep-secondary text-xs block mb-1">{meta.idLabel}</label>
          <input
            type="text"
            value={pixelId}
            onChange={e => setPixelId(e.target.value)}
            placeholder={meta.idPlaceholder}
            className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
          />
        </div>

        {/* Avançado collapsible */}
        <button
          onClick={() => setShowAdvanced(s => !s)}
          className="flex items-center gap-1.5 text-ep-secondary hover:text-ep-accent text-xs transition-colors"
        >
          {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Configurações avançadas (server-side)
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-1">
            <SecretField
              label={meta.tokenLabel}
              value={accessToken}
              placeholder={meta.tokenPlaceholder}
              onChange={setAccessToken}
            />
            {meta.hasTestCode && (
              <div>
                <label className="text-ep-secondary text-xs block mb-1">Test Event Code (opcional)</label>
                <input
                  type="text"
                  value={testEventCode}
                  onChange={e => setTestEventCode(e.target.value)}
                  placeholder="Ex: TEST12345"
                  className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
                />
                <p className="text-ep-muted text-xs mt-1">Encontre em Meta → Events Manager → Test Events</p>
              </div>
            )}
            {meta.hasConvLabel && (
              <div>
                <label className="text-ep-secondary text-xs block mb-1">Conversion Label</label>
                <input
                  type="text"
                  value={convLabel}
                  onChange={e => setConvLabel(e.target.value)}
                  placeholder="Ex: AbCd1234XYZ"
                  className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
                />
              </div>
            )}
          </div>
        )}

        {/* Test event */}
        <div className="pt-1 flex items-center gap-2 flex-wrap">
          <select
            value={testEvent}
            onChange={e => setTestEvent(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1.5 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary text-xs focus:outline-none focus:border-ep-accent"
          >
            {STANDARD_EVENTS.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <button
            onClick={handleTest}
            disabled={testing || !pixelIdTrimmed}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary hover:text-ep-accent hover:border-ep-accent text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
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

        {/* Code snippet */}
        <div className="pt-1 border-t border-ep-border-subtle flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={() => setShowSnippet(s => !s)}
            className="text-ep-secondary hover:text-ep-accent text-xs transition-colors flex items-center gap-1"
          >
            {showSnippet ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {showSnippet ? 'Ocultar código' : 'Ver código'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={copySnippet}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-ep-raised border border-ep-border-default hover:border-ep-accent hover:text-ep-accent text-ep-secondary transition-colors"
            >
              {snippetCopied ? <Check size={11} className="text-ep-success" /> : <Copy size={11} />}
              {snippetCopied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all',
                saved
                  ? 'bg-ep-success/20 border border-ep-success/30 text-ep-success'
                  : 'bg-ep-accent text-ep-base hover:bg-ep-accent-dark',
              )}
            >
              {saved ? <Check size={11} /> : null}
              {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        </div>

        {showSnippet && (
          <pre className="p-3 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
            {snippet}
          </pre>
        )}
      </div>
    </div>
  )
}
