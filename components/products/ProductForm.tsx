'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Star, CheckCircle2, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { Toggle } from '@/components/ui/Toggle'
import type { Product } from '@/lib/services/product.service'
import type { ShippingOption, OrderBump, CheckoutReview } from '@/lib/types/checkout'
import type { PixelConfig } from '@/lib/types/pixel'
import { PlatformIcon, PLATFORM_CONFIG, type Platform } from '@/components/pixels/PlatformIcon'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  name: string; description: string; imageUrl: string; price: string
  currency: string; interval: string; slug: string; defaultShipping: string
  shippingOptions: ShippingOption[]; orderBumps: OrderBump[]
  reviews: CheckoutReview[]; logoUrl: string; brandName: string; legalName: string
  showReviews: boolean; paymentMethods: string[]; checkoutTemplate: string
  checkoutLanguage: string; requirePhone: boolean; requireAddress: boolean
  utmifyConfigIds: string[]; successUrl: string; metaPixelId: string
  customDomain: string; status: 'active' | 'archived'; stock: string; pixelIds: string[]
}

const PAYMENT_METHODS = [
  { id: 'card', label: 'Cartão de Crédito/Débito', desc: 'Visa, Mastercard, Amex...' },
  { id: 'apple_pay', label: 'Apple Pay', desc: 'Pagamento via dispositivos Apple' },
  { id: 'google_pay', label: 'Google Pay', desc: 'Pagamento via Google Wallet' },
  { id: 'mbway', label: 'MB WAY', desc: 'Pagamento via app MB WAY (Portugal)' },
  { id: 'multibanco', label: 'Multibanco', desc: 'Referência Multibanco (Portugal)' },
  { id: 'satispay', label: 'Satispay', desc: 'Pagamento via app Satispay (Itália)' },
]

const TEMPLATES = [
  { id: 'single_step', label: 'Padrão (Clean)' },
  { id: 'promo', label: 'Promoção' },
  { id: 'info_product', label: 'Produto Digital' },
  { id: 'dropshipping', label: 'Dropshipping' },
  { id: 'stripe_split', label: 'Stripe Split' },
]

const LANGUAGES = [
  { id: 'pt', label: 'Português' }, { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' }, { id: 'it', label: 'Italiano' },
]

const CURRENCIES = [
  { id: 'EUR', label: '€ EUR' }, { id: 'BRL', label: 'R$ BRL' },
  { id: 'USD', label: '$ USD' }, { id: 'GBP', label: '£ GBP' },
]

const NAV_ITEMS = [
  { id: 'basico', label: 'Básico' },
  { id: 'preco', label: 'Preço' },
  { id: 'envio', label: 'Envio' },
  { id: 'branding', label: 'Branding' },
  { id: 'bumps', label: 'Bumps' },
  { id: 'avaliacoes', label: 'Avaliações' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'checkout', label: 'Checkout' },
  { id: 'avancado', label: 'Avançado' },
]

function toForm(p?: Product | null): FormData {
  return {
    name: p?.name ?? '', description: p?.description ?? '', imageUrl: p?.imageUrl ?? '',
    price: p ? (p.price / 100).toFixed(2) : '', currency: p?.currency ?? 'EUR',
    interval: p?.interval ?? 'mês', slug: p?.slug ?? '',
    defaultShipping: p ? (p.defaultShipping / 100).toFixed(2) : '',
    shippingOptions: p?.shippingOptions ?? [], orderBumps: p?.orderBumps ?? [],
    reviews: p?.reviews ?? [], logoUrl: p?.logoUrl ?? '', brandName: p?.brandName ?? '',
    legalName: p?.legalName ?? '', showReviews: p?.showReviews ?? false,
    paymentMethods: p?.paymentMethods?.length ? p.paymentMethods : ['card'],
    checkoutTemplate: p?.checkoutTemplate ?? 'single_step', checkoutLanguage: p?.checkoutLanguage ?? 'pt',
    requirePhone: p?.requirePhone ?? false, requireAddress: p?.requireAddress ?? false,
    utmifyConfigIds: (p?.utmifyConfigIds ?? (p?.utmifyConfigId ? [p.utmifyConfigId] : [])) as string[],
    successUrl: p?.successUrl ?? '',
    metaPixelId: p?.metaPixelId ?? '', customDomain: p?.customDomain ?? '',
    status: p?.status ?? 'active', stock: String(p?.stock ?? -1),
    pixelIds: (p?.pixelIds ?? []) as string[],
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full px-3 py-2.5 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors'
const SELECT_CLS = INPUT_CLS + ' appearance-none'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-ep-secondary text-xs font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-ep-muted text-xs mt-1">{hint}</p>}
    </div>
  )
}

function ToggleRow({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-ep-primary text-sm">{label}</p>
        {desc && <p className="text-ep-muted text-xs">{desc}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

// ─── UtmifySelector ───────────────────────────────────────────────────────────

interface UtmifyConfigItem { id: string; name: string; enabled: boolean }

function UtmifySelector({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const [configs, setConfigs] = useState<UtmifyConfigItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/integrations/utmify')
      .then(r => r.json())
      .then((data: UtmifyConfigItem[]) => { setConfigs(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  if (loading) return <p className="text-ep-muted text-xs">Carregando configs UTMify…</p>
  if (configs.length === 0) return (
    <p className="text-ep-muted text-xs">
      Nenhuma config UTMify criada.{' '}
      <a href="/integracoes" target="_blank" className="text-ep-accent hover:underline">Criar em Integrações →</a>
    </p>
  )

  return (
    <div className="space-y-2">
      <p className="text-ep-secondary text-xs">Selecione as configs UTMify para este produto</p>
      <div className="space-y-1.5">
        {configs.map(c => {
          const isActive = selected.includes(c.id)
          return (
            <button key={c.id} type="button" onClick={() => toggle(c.id)}
              className={clsx('w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-all',
                isActive ? 'bg-ep-accent/10 border-ep-accent' : 'bg-ep-raised border-ep-border-default hover:border-ep-border-subtle',
                !c.enabled && 'opacity-50')}>
              <span className={clsx('font-medium', isActive ? 'text-ep-accent' : 'text-ep-primary')}>{c.name || 'Sem nome'}</span>
              {!c.enabled && <span className="text-ep-muted">desativado</span>}
              {isActive && <CheckCircle2 size={12} className="text-ep-accent flex-shrink-0" />}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && <p className="text-ep-muted text-xs">{selected.length} config{selected.length !== 1 ? 's' : ''} selecionada{selected.length !== 1 ? 's' : ''}</p>}
    </div>
  )
}

// ─── PixelSelector ────────────────────────────────────────────────────────────

function PixelSelector({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
  const [pixels, setPixels] = useState<PixelConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pixels').then(r => r.json()).then((data: PixelConfig[]) => { setPixels(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])

  if (loading) return <p className="text-ep-muted text-xs">Carregando pixels…</p>
  if (pixels.length === 0) return (
    <p className="text-ep-muted text-xs">
      Nenhum pixel criado.{' '}
      <a href="/pixels" target="_blank" className="text-ep-accent hover:underline">Criar pixels →</a>
    </p>
  )

  return (
    <div className="space-y-2">
      <p className="text-ep-secondary text-xs">Selecione os pixels que devem disparar no checkout deste produto</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {pixels.map(p => {
          const cfg = PLATFORM_CONFIG[p.platform as Platform]
          const isActive = selected.includes(p.id)
          return (
            <button key={p.id} type="button" onClick={() => toggle(p.id)}
              className={clsx('flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all',
                isActive ? `${cfg?.bg ?? 'bg-ep-accent/10'} ${cfg?.border ?? 'border-ep-accent'} border-opacity-100` : 'bg-ep-raised border-ep-border-default hover:border-ep-border-subtle')}>
              <div className={clsx('w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0', cfg?.bg, 'border', cfg?.border)}>
                {cfg && <PlatformIcon platform={p.platform as Platform} size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ep-primary text-xs font-medium truncate">{p.name || cfg?.label || p.platform}</p>
                <p className="text-ep-muted text-xs truncate">{cfg?.label ?? p.platform}</p>
              </div>
              {isActive && <CheckCircle2 size={14} className="text-ep-accent flex-shrink-0" />}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && <p className="text-ep-muted text-xs">{selected.length} pixel{selected.length !== 1 ? 's' : ''} selecionado{selected.length !== 1 ? 's' : ''}</p>}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

interface ProductFormProps {
  product?: Product | null
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const isEdit = !!product

  const [form, setForm] = useState<FormData>(() => toForm(product))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('basico')

  // Shipping
  const [newShipLabel, setNewShipLabel] = useState('')
  const [newShipPrice, setNewShipPrice] = useState('')
  // Bumps
  const [newBumpLabel, setNewBumpLabel] = useState('')
  const [newBumpPrice, setNewBumpPrice] = useState('')
  const [newBumpDesc, setNewBumpDesc] = useState('')
  // Reviews
  const [newRevName, setNewRevName] = useState('')
  const [newRevText, setNewRevText] = useState('')
  const [newRevRating, setNewRevRating] = useState('5')

  // Section refs for IntersectionObserver
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => { setForm(toForm(product)) }, [product])

  // IntersectionObserver to highlight active nav item
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            break
          }
        }
      },
      { threshold: 0.3, rootMargin: '-80px 0px -50% 0px' }
    )
    Object.values(sectionRefs.current).forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => setForm(f => ({ ...f, [key]: value }))
  const toggleMethod = (id: string) => set('paymentMethods', form.paymentMethods.includes(id) ? form.paymentMethods.filter(m => m !== id) : [...form.paymentMethods, id])

  const addShipping = () => {
    if (!newShipLabel.trim()) return
    set('shippingOptions', [...form.shippingOptions, { id: `ship_${Date.now()}`, label: newShipLabel.trim(), price: Math.round(parseFloat(newShipPrice || '0') * 100) }])
    setNewShipLabel(''); setNewShipPrice('')
  }
  const removeShipping = (id: string) => set('shippingOptions', form.shippingOptions.filter(s => s.id !== id))

  const addBump = () => {
    if (!newBumpLabel.trim() || !newBumpPrice.trim()) return
    set('orderBumps', [...form.orderBumps, { id: `bump_${Date.now()}`, name: newBumpLabel.trim(), description: newBumpDesc.trim(), price: Math.round(parseFloat(newBumpPrice) * 100), currency: form.currency }])
    setNewBumpLabel(''); setNewBumpPrice(''); setNewBumpDesc('')
  }
  const removeBump = (id: string) => set('orderBumps', form.orderBumps.filter(b => b.id !== id))

  const addReview = () => {
    if (!newRevName.trim() || !newRevText.trim()) return
    set('reviews', [...form.reviews, { id: `rev_${Date.now()}`, author: newRevName.trim(), comment: newRevText.trim(), rating: Number(newRevRating) }])
    setNewRevName(''); setNewRevText(''); setNewRevRating('5')
  }
  const removeReview = (idx: number) => set('reviews', form.reviews.filter((_, i) => i !== idx))

  const sectionHasData = useCallback((id: string): boolean => {
    switch (id) {
      case 'basico': return !!(form.name || form.description || form.imageUrl)
      case 'preco': return !!(form.price)
      case 'envio': return form.shippingOptions.length > 0
      case 'branding': return !!(form.logoUrl || form.brandName || form.legalName)
      case 'bumps': return form.orderBumps.length > 0
      case 'avaliacoes': return form.reviews.length > 0
      case 'pagamento': return form.paymentMethods.length > 0
      case 'checkout': return !!(form.checkoutTemplate !== 'single_step' || form.requirePhone || form.requireAddress)
      case 'avancado': return !!(form.successUrl || form.metaPixelId || form.customDomain || form.pixelIds.length > 0 || form.utmifyConfigIds.length > 0)
      default: return false
    }
  }, [form])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Nome é obrigatório'); scrollTo('basico'); return }
    const priceVal = parseFloat(form.price)
    if (isNaN(priceVal) || priceVal <= 0) { setError('Preço inválido'); scrollTo('preco'); return }

    setSaving(true)
    try {
      const body = {
        name: form.name.trim(), description: form.description.trim(), imageUrl: form.imageUrl.trim(),
        price: Math.round(priceVal * 100), currency: form.currency, interval: form.interval,
        slug: form.slug.trim() || null, defaultShipping: Math.round(parseFloat(form.defaultShipping || '0') * 100),
        shippingOptions: form.shippingOptions, orderBumps: form.orderBumps, reviews: form.reviews,
        logoUrl: form.logoUrl.trim(), brandName: form.brandName.trim(), legalName: form.legalName.trim(),
        showReviews: form.showReviews, paymentMethods: form.paymentMethods,
        checkoutTemplate: form.checkoutTemplate, checkoutLanguage: form.checkoutLanguage,
        requirePhone: form.requirePhone, requireAddress: form.requireAddress,
        utmifyConfigId: form.utmifyConfigIds[0] || null,
        utmifyConfigIds: form.utmifyConfigIds,
        successUrl: form.successUrl.trim(),
        metaPixelId: form.metaPixelId.trim(), customDomain: form.customDomain.trim(),
        status: form.status, stock: parseInt(form.stock) || -1, pixelIds: form.pixelIds,
        stripeId: product?.stripeId ?? '',
      }

      const url = isEdit ? `/api/products/${product!.id}` : '/api/products'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro ao salvar'); return }
      router.push('/produtos')
    } catch { setError('Erro de ligação. Tente novamente.') } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Header sticky */}
      <div className="sticky top-0 z-40 bg-ep-base/95 backdrop-blur-sm border-b border-ep-border-default px-6 py-3 flex items-center justify-between">
        <button type="button" onClick={() => router.push('/produtos')} className="flex items-center gap-2 text-ep-secondary hover:text-ep-primary text-sm transition-colors">
          <ArrowLeft size={16} /> Voltar para Produtos
        </button>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/produtos')} className="px-4 py-2 text-ep-secondary hover:text-ep-primary text-sm transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-ep-accent text-ep-base rounded-lg text-sm font-semibold hover:bg-ep-accent-dark transition-colors disabled:opacity-60">
            {saving ? <><Loader2 size={14} className="animate-spin" /> A salvar…</> : isEdit ? 'Salvar alterações' : 'Criar produto'}
          </button>
        </div>
      </div>

      <div className="flex px-6 py-8 gap-8">
        {/* Nav lateral — hidden no mobile */}
        <nav className="w-56 flex-shrink-0 sticky top-20 h-fit hidden lg:block">
          <div className="space-y-0.5">
            {NAV_ITEMS.map(item => (
              <button key={item.id} type="button" onClick={() => scrollTo(item.id)}
                className={clsx(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-r-md border-l-2 transition-all text-left',
                  activeSection === item.id
                    ? 'border-ep-accent bg-ep-accent/5 text-ep-accent'
                    : 'border-transparent text-ep-secondary hover:text-ep-primary hover:bg-ep-raised/50'
                )}>
                {sectionHasData(item.id) && <span className="w-1.5 h-1.5 rounded-full bg-ep-accent flex-shrink-0" />}
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Conteúdo principal */}
        <div className="flex-1 max-w-3xl space-y-6">

          {/* Básico */}
          <section id="basico" ref={el => { sectionRefs.current.basico = el }} className="bg-ep-surface border border-ep-border-default rounded-xl p-6 space-y-4">
            <h3 className="text-ep-primary font-semibold text-sm">Informações Básicas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome do Produto *">
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Curso de Marketing Digital" className={INPUT_CLS} />
              </Field>
              <Field label="Slug (URL do checkout)" hint={form.slug ? `/checkout/${form.slug}` : 'Gerado automaticamente se vazio'}>
                <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="meu-produto" className={INPUT_CLS} />
              </Field>
            </div>
            <Field label="Descrição (opcional)">
              <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Descrição curta do produto" rows={3}
                className={INPUT_CLS + ' resize-none'} />
            </Field>
            <Field label="URL da Imagem do Produto" hint="Imagem exibida no checkout (recomendado: 400x400px)">
              <div className="flex gap-3 items-start">
                <input value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)} placeholder="https://seusite.com/produto.jpg" className={INPUT_CLS + ' flex-1'} />
                <div className="w-20 h-20 rounded-lg border border-ep-border-default bg-ep-raised flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <span className="text-ep-muted text-xs">Preview</span>
                  )}
                </div>
              </div>
            </Field>
          </section>

          {/* Preço */}
          <section id="preco" ref={el => { sectionRefs.current.preco = el }} className="bg-ep-surface border border-ep-border-default rounded-xl p-6 space-y-4">
            <h3 className="text-ep-primary font-semibold text-sm">Preço</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Preço *">
                <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="29.90" className={INPUT_CLS} />
              </Field>
              <Field label="Moeda">
                <select value={form.currency} onChange={e => set('currency', e.target.value)} className={SELECT_CLS}>
                  {CURRENCIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Intervalo">
                <select value={form.interval} onChange={e => set('interval', e.target.value)} className={SELECT_CLS}>
                  <option value="unit">Pagamento único</option>
                  <option value="mês">Mensal</option>
                  <option value="ano">Anual</option>
                </select>
              </Field>
            </div>
            <Field label="Frete Padrão (opcional)" hint="Usado quando não há opções de envio. Deixe vazio para frete grátis.">
              <input type="number" value={form.defaultShipping} onChange={e => set('defaultShipping', e.target.value)} placeholder="0.00" className={INPUT_CLS} />
            </Field>
          </section>

          {/* Envio */}
          <section id="envio" ref={el => { sectionRefs.current.envio = el }} className="bg-ep-surface border border-ep-border-default rounded-xl p-6 space-y-4">
            <h3 className="text-ep-primary font-semibold text-sm">Opções de Envio</h3>
            <p className="text-ep-muted text-xs">Adicione opções de envio para o cliente escolher no checkout.</p>
            {form.shippingOptions.map(opt => (
              <div key={opt.id} className="flex items-center gap-2 p-2.5 bg-ep-raised rounded-lg border border-ep-border-default">
                <span className="flex-1 text-ep-primary text-sm">{opt.label}</span>
                <span className="text-ep-accent text-sm font-medium">{opt.price === 0 ? 'Grátis' : `${(opt.price / 100).toFixed(2)} ${form.currency}`}</span>
                <button type="button" onClick={() => removeShipping(opt.id)} className="text-ep-muted hover:text-ep-danger transition-colors p-1"><Trash2 size={13} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newShipLabel} onChange={e => setNewShipLabel(e.target.value)} placeholder="Ex: Envio Standard" className={INPUT_CLS + ' flex-1'} />
              <input value={newShipPrice} onChange={e => setNewShipPrice(e.target.value)} placeholder="4.99" type="number" className={INPUT_CLS + ' w-24'} />
              <button type="button" onClick={addShipping} className="flex items-center gap-1 px-3 py-2 bg-ep-accent text-ep-base rounded-lg text-xs font-semibold hover:bg-ep-accent-dark transition-colors">
                <Plus size={13} /> Adicionar
              </button>
            </div>
          </section>

          {/* Branding */}
          <section id="branding" ref={el => { sectionRefs.current.branding = el }} className="bg-ep-surface border border-ep-border-default rounded-xl p-6 space-y-4">
            <h3 className="text-ep-primary font-semibold text-sm">Branding do Checkout</h3>
            <Field label="URL do Logo (opcional)" hint="Logo exibido no cabeçalho do checkout (altura recomendada: 32px)">
              <input value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)} placeholder="https://seusite.com/logo.png" className={INPUT_CLS} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nome da Marca" hint="Exibido ao lado do logo">
                <input value={form.brandName} onChange={e => set('brandName', e.target.value)} placeholder="Nome da sua marca" className={INPUT_CLS} />
              </Field>
              <Field label="Nome Legal / Rodapé" hint="Usado no texto de autorização">
                <input value={form.legalName} onChange={e => set('legalName', e.target.value)} placeholder="Empresa Lda." className={INPUT_CLS} />
              </Field>
            </div>
          </section>

          {/* Bumps */}
          <section id="bumps" ref={el => { sectionRefs.current.bumps = el }} className="bg-ep-surface border border-ep-border-default rounded-xl p-6 space-y-4">
            <h3 className="text-ep-primary font-semibold text-sm">Order Bumps</h3>
            <p className="text-ep-muted text-xs">Ofertas adicionais exibidas antes do pagamento para aumentar o ticket médio.</p>
            {form.orderBumps.map(bump => (
              <div key={bump.id} className="flex items-center gap-2 p-2.5 bg-ep-raised rounded-lg border border-ep-border-default">
                <div className="flex-1 min-w-0">
                  <p className="text-ep-primary text-sm font-medium truncate">{bump.name}</p>
                  {bump.description && <p className="text-ep-muted text-xs truncate">{bump.description}</p>}
                </div>
                <span className="text-ep-accent text-sm font-medium flex-shrink-0">+{(bump.price / 100).toFixed(2)} {form.currency}</span>
                <button type="button" onClick={() => removeBump(bump.id)} className="text-ep-muted hover:text-ep-danger transition-colors p-1 flex-shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={newBumpLabel} onChange={e => setNewBumpLabel(e.target.value)} placeholder="Nome do bump" className={INPUT_CLS + ' flex-1'} />
                <input value={newBumpPrice} onChange={e => setNewBumpPrice(e.target.value)} placeholder="9.99" type="number" className={INPUT_CLS + ' w-24'} />
              </div>
              <div className="flex gap-2">
                <input value={newBumpDesc} onChange={e => setNewBumpDesc(e.target.value)} placeholder="Descrição curta (opcional)" className={INPUT_CLS + ' flex-1'} />
                <button type="button" onClick={addBump} className="flex items-center gap-1 px-3 py-2 bg-ep-accent text-ep-base rounded-lg text-xs font-semibold hover:bg-ep-accent-dark transition-colors flex-shrink-0">
                  <Plus size={13} /> Adicionar
                </button>
              </div>
            </div>
          </section>

          {/* Avaliações */}
          <section id="avaliacoes" ref={el => { sectionRefs.current.avaliacoes = el }} className="bg-ep-surface border border-ep-border-default rounded-xl p-6 space-y-4">
            <h3 className="text-ep-primary font-semibold text-sm">Avaliações / Depoimentos</h3>
            <ToggleRow checked={form.showReviews} onChange={v => set('showReviews', v)} label="Exibir avaliações no checkout" desc="Mostra avaliações para aumentar a confiança" />
            {form.reviews.map((rev, idx) => (
              <div key={rev.id ?? idx} className="flex items-start gap-2 p-2.5 bg-ep-raised rounded-lg border border-ep-border-default">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-ep-primary text-sm font-medium">{rev.author}</p>
                    <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                      {Array.from({ length: rev.rating }).map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                    </span>
                  </div>
                  <p className="text-ep-muted text-xs truncate">{rev.comment}</p>
                </div>
                <button type="button" onClick={() => removeReview(idx)} className="text-ep-muted hover:text-ep-danger transition-colors p-1 flex-shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={newRevName} onChange={e => setNewRevName(e.target.value)} placeholder="Nome do cliente" className={INPUT_CLS + ' flex-1'} />
                <select value={newRevRating} onChange={e => setNewRevRating(e.target.value)} className={SELECT_CLS + ' w-20'}>
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input value={newRevText} onChange={e => setNewRevText(e.target.value)} placeholder="Texto da avaliação" className={INPUT_CLS + ' flex-1'} />
                <button type="button" onClick={addReview} className="flex items-center gap-1 px-3 py-2 bg-ep-accent text-ep-base rounded-lg text-xs font-semibold hover:bg-ep-accent-dark transition-colors flex-shrink-0">
                  <Plus size={13} /> Adicionar
                </button>
              </div>
            </div>
          </section>

          {/* Pagamento */}
          <section id="pagamento" ref={el => { sectionRefs.current.pagamento = el }} className="bg-ep-surface border border-ep-border-default rounded-xl p-6 space-y-4">
            <h3 className="text-ep-primary font-semibold text-sm">Métodos de Pagamento</h3>
            <p className="text-ep-muted text-xs">Selecione os métodos de pagamento disponíveis neste produto.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => (
                <label key={m.id} className={clsx(
                  'flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  form.paymentMethods.includes(m.id) ? 'border-ep-accent bg-ep-accent/5' : 'border-ep-border-default hover:border-ep-accent/40')}>
                  <div>
                    <p className="text-ep-primary text-sm font-medium">{m.label}</p>
                    <p className="text-ep-muted text-xs">{m.desc}</p>
                  </div>
                  <input type="checkbox" checked={form.paymentMethods.includes(m.id)} onChange={() => toggleMethod(m.id)} className="w-4 h-4 accent-ep-accent flex-shrink-0" />
                </label>
              ))}
            </div>
          </section>

          {/* Checkout */}
          <section id="checkout" ref={el => { sectionRefs.current.checkout = el }} className="bg-ep-surface border border-ep-border-default rounded-xl p-6 space-y-4">
            <h3 className="text-ep-primary font-semibold text-sm">Configurações do Checkout</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Template do Checkout">
                <select value={form.checkoutTemplate} onChange={e => set('checkoutTemplate', e.target.value)} className={SELECT_CLS}>
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Idioma do Checkout">
                <select value={form.checkoutLanguage} onChange={e => set('checkoutLanguage', e.target.value)} className={SELECT_CLS}>
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </Field>
            </div>
            <ToggleRow checked={form.requirePhone} onChange={v => set('requirePhone', v)} label="Exigir Telefone" desc="Solicitar número de telefone no checkout" />
            <ToggleRow checked={form.requireAddress} onChange={v => set('requireAddress', v)} label="Exigir Endereço" desc="Solicitar endereço completo no checkout" />
          </section>

          {/* Avançado */}
          <section id="avancado" ref={el => { sectionRefs.current.avancado = el }} className="bg-ep-surface border border-ep-border-default rounded-xl p-6 space-y-4">
            <h3 className="text-ep-primary font-semibold text-sm">Avançado</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Estoque disponível" hint="-1 = ilimitado">
                <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} placeholder="-1" className={INPUT_CLS} />
              </Field>
              <Field label="URL de Sucesso" hint="Redireciona após pagamento confirmado">
                <input value={form.successUrl} onChange={e => set('successUrl', e.target.value)} placeholder="https://seusite.com/obrigado" className={INPUT_CLS} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Meta Pixel ID" hint="Para rastreamento de conversões">
                <input value={form.metaPixelId} onChange={e => set('metaPixelId', e.target.value)} placeholder="123456789012345" className={INPUT_CLS} />
              </Field>
              <Field label="Domínio customizado" hint="Ex: checkout.suamarca.com">
                <input value={form.customDomain} onChange={e => set('customDomain', e.target.value)} placeholder="checkout.suamarca.com" className={INPUT_CLS} />
              </Field>
            </div>
            <ToggleRow checked={form.status === 'active'} onChange={v => set('status', v ? 'active' : 'archived')} label="Ativo" desc="Produtos inativos não aparecem no checkout" />

            {/* Pixels */}
            <div className="pt-4 border-t border-ep-border-subtle">
              <h4 className="text-ep-primary font-medium text-sm mb-3">Pixels de Rastreamento</h4>
              <PixelSelector selected={form.pixelIds} onChange={ids => set('pixelIds', ids)} />
            </div>

            {/* UTMify */}
            <div className="pt-4 border-t border-ep-border-subtle">
              <h4 className="text-ep-primary font-medium text-sm mb-3">Integração UTMify</h4>
              <UtmifySelector selected={form.utmifyConfigIds} onChange={ids => set('utmifyConfigIds', ids)} />
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-ep-danger/10 border border-ep-danger/20 rounded-lg p-3 text-ep-danger text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </form>
  )
}
