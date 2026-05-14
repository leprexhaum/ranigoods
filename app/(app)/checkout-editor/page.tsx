'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Palette, RotateCcw, Save, Check, Monitor, Tablet, Smartphone } from 'lucide-react'
import clsx from 'clsx'
import type { CheckoutColors } from '@/lib/types/checkout'

const PRESETS: Record<string, { label: string; colors: CheckoutColors }> = {
  padrao:      { label: 'Padrão',      colors: { panelBg: '#012B5D', formBg: '#FFFFFF', accent: '#0074D4', buttonBg: '#FFF02A', buttonText: '#000000' } },
  dark:        { label: 'Dark',        colors: { panelBg: '#1A1A2E', formBg: '#16213E', accent: '#0F3460', buttonBg: '#E94560', buttonText: '#FFFFFF' } },
  verde:       { label: 'Verde',       colors: { panelBg: '#1B4332', formBg: '#FFFFFF', accent: '#2D6A4F', buttonBg: '#40916C', buttonText: '#FFFFFF' } },
  roxo:        { label: 'Roxo',        colors: { panelBg: '#2D1B69', formBg: '#FFFFFF', accent: '#7C3AED', buttonBg: '#A78BFA', buttonText: '#FFFFFF' } },
  coral:       { label: 'Coral',       colors: { panelBg: '#1F2937', formBg: '#FFFFFF', accent: '#F97316', buttonBg: '#FB923C', buttonText: '#FFFFFF' } },
  minimalista: { label: 'Minimalista', colors: { panelBg: '#FFFFFF', formBg: '#FFFFFF', accent: '#111827', buttonBg: '#111827', buttonText: '#FFFFFF' } },
}

const COLOR_FIELDS: { key: keyof CheckoutColors; label: string }[] = [
  { key: 'panelBg',    label: 'Fundo do produto' },
  { key: 'formBg',     label: 'Fundo do formulário' },
  { key: 'accent',     label: 'Cor de destaque' },
  { key: 'buttonBg',   label: 'Botão (fundo)' },
  { key: 'buttonText', label: 'Botão (texto)' },
]

type DeviceView = 'desktop' | 'tablet' | 'mobile'
type MobileTab = 'config' | 'preview'

export default function CheckoutEditorPage() {
  const [colors, setColors] = useState<CheckoutColors>({
    panelBg: '#012B5D', formBg: '#FFFFFF', accent: '#0074D4', buttonBg: '#FFF02A', buttonText: '#000000',
  })
  const [defaults, setDefaults] = useState<CheckoutColors>(colors)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<{ id: string; name: string; slug: string }[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [scope, setScope] = useState<'global' | 'product'>('global')
  const [deviceView, setDeviceView] = useState<DeviceView>('desktop')
  const [mobileTab, setMobileTab] = useState<MobileTab>('config')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Load current config
  useEffect(() => {
    async function load() {
      try {
        const [configRes, productsRes] = await Promise.all([
          fetch('/api/checkout-config'),
          fetch('/api/products'),
        ])
        if (configRes.ok) {
          const data = await configRes.json()
          setColors(data.colors)
          setDefaults(data.defaults)
        }
        if (productsRes.ok) {
          const data = await productsRes.json()
          const list = (data.products ?? data ?? []) as { id: string; name: string; slug: string }[]
          setProducts(list.filter(p => p.slug))
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  // Send colors to iframe on change
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'checkout-colors-update', colors }, '*')
    }
  }, [colors])

  const handleColorChange = useCallback((key: keyof CheckoutColors, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }))
  }, [])

  const applyPreset = useCallback((preset: CheckoutColors) => {
    setColors(preset)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const body: { colors: Partial<CheckoutColors>; productId?: string } = { colors }
      if (scope === 'product' && selectedProduct) {
        body.productId = selectedProduct
      }
      const res = await fetch('/api/checkout-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally { setSaving(false) }
  }, [colors, scope, selectedProduct])

  const handleReset = useCallback(() => {
    setColors(defaults)
  }, [defaults])

  const previewSlug = products.find(p => p.id === selectedProduct)?.slug ?? products[0]?.slug ?? ''
  const previewUrl = previewSlug
    ? `/checkout/${previewSlug}?preview=true&colors=${btoa(JSON.stringify(colors))}`
    : ''

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-ep-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const configPanel = (
    <div className="space-y-6">
      {/* Color Pickers */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Palette size={14} className="text-ep-accent" />
          <h2 className="text-ep-primary text-sm font-semibold">Cores</h2>
        </div>
        <div className="space-y-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <label className="text-ep-secondary text-xs font-medium">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={e => handleColorChange(key, e.target.value)}
                  className="w-8 h-8 rounded-md border border-ep-border-default cursor-pointer"
                  style={{ padding: 0 }}
                />
                <input
                  type="text"
                  value={colors[key]}
                  onChange={e => handleColorChange(key, e.target.value)}
                  className="w-20 px-2 py-1 bg-ep-raised border border-ep-border-default rounded text-ep-primary text-xs font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-5">
        <h2 className="text-ep-primary text-sm font-semibold mb-3">Presets</h2>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PRESETS).map(([id, { label, colors: preset }]) => (
            <button
              key={id}
              onClick={() => applyPreset(preset)}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-ep-border-default hover:border-ep-accent/40 transition-all"
            >
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.panelBg, border: '1px solid rgba(0,0,0,0.1)' }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.accent, border: '1px solid rgba(0,0,0,0.1)' }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.buttonBg, border: '1px solid rgba(0,0,0,0.1)' }} />
              </div>
              <span className="text-ep-muted text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scope */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-5">
        <h2 className="text-ep-primary text-sm font-semibold mb-3">Aplicar em</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="scope"
              checked={scope === 'global'}
              onChange={() => setScope('global')}
              className="accent-ep-accent"
            />
            <span className="text-ep-secondary text-xs">Todos os produtos</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="scope"
              checked={scope === 'product'}
              onChange={() => setScope('product')}
              className="accent-ep-accent"
            />
            <span className="text-ep-secondary text-xs">Produto específico</span>
          </label>
          {scope === 'product' && (
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="w-full mt-2 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-xs"
            >
              <option value="">Selecionar produto...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-ep-accent text-ep-base text-xs font-bold rounded-lg hover:bg-ep-accent-dark transition-colors disabled:opacity-60"
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? 'Salvo' : saving ? 'Salvando...' : 'Salvar configuração'}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 bg-ep-raised border border-ep-border-default text-ep-secondary text-xs font-medium rounded-lg hover:text-ep-primary transition-colors"
        >
          <RotateCcw size={12} />
          Padrão
        </button>
      </div>
    </div>
  )

  const previewPanel = (
    <div className="flex flex-col h-full">
      {/* Device selector */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-ep-muted text-xs font-medium">Preview</p>
        <div className="flex items-center gap-1 bg-ep-raised border border-ep-border-default rounded-lg p-0.5">
          {([
            { id: 'desktop' as DeviceView, icon: Monitor, label: 'Desktop' },
            { id: 'tablet' as DeviceView, icon: Tablet, label: 'Tablet' },
            { id: 'mobile' as DeviceView, icon: Smartphone, label: 'Mobile' },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setDeviceView(id)}
              title={label}
              className={clsx(
                'p-1.5 rounded-md transition-all',
                deviceView === id ? 'bg-ep-accent/10 text-ep-accent' : 'text-ep-muted hover:text-ep-primary'
              )}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Iframe */}
      <div className={clsx(
        'flex-1 border border-ep-border-default rounded-lg overflow-hidden bg-gray-100 mx-auto transition-all duration-300',
        deviceView === 'desktop' && 'w-full',
        deviceView === 'tablet' && 'w-[768px] max-w-full',
        deviceView === 'mobile' && 'w-[375px] max-w-full',
      )}>
        {previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full min-h-[600px]"
            style={{ border: 'none' }}
            onLoad={() => {
              if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage({ type: 'checkout-colors-update', colors }, '*')
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-ep-muted text-xs">
            Nenhum produto com slug disponível para preview
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-ep-accent/10 border border-ep-accent/20 flex items-center justify-center">
          <Palette size={15} className="text-ep-accent" />
        </div>
        <div>
          <h1 className="text-ep-primary text-lg font-bold">Personalizar Checkout</h1>
          <p className="text-ep-muted text-xs">Customize as cores do seu checkout</p>
        </div>
      </div>

      {/* Desktop/Tablet: side by side */}
      <div className="hidden lg:grid lg:grid-cols-[380px_1fr] gap-5 items-start">
        <div>{configPanel}</div>
        <div className="sticky top-4 min-h-[700px]">{previewPanel}</div>
      </div>

      {/* Mobile: tabs */}
      <div className="lg:hidden">
        <div className="flex gap-1 bg-ep-raised border border-ep-border-default rounded-lg p-1 mb-4">
          <button
            onClick={() => setMobileTab('config')}
            className={clsx(
              'flex-1 py-2 text-xs font-medium rounded-md transition-all',
              mobileTab === 'config' ? 'bg-ep-accent/10 text-ep-accent' : 'text-ep-muted'
            )}
          >
            Configurações
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={clsx(
              'flex-1 py-2 text-xs font-medium rounded-md transition-all',
              mobileTab === 'preview' ? 'bg-ep-accent/10 text-ep-accent' : 'text-ep-muted'
            )}
          >
            Preview
          </button>
        </div>
        {mobileTab === 'config' ? configPanel : <div className="min-h-[500px]">{previewPanel}</div>}
      </div>
    </div>
  )
}
