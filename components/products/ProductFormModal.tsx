'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, ChevronDown, ChevronUp, Star } from 'lucide-react'
import clsx from 'clsx'
import type { Product } from '@/lib/services/product.service'
import type { ShippingOption, OrderBump, CheckoutReview } from '@/lib/types/checkout'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  name:             string
  description:      string
  imageUrl:         string
  price:            string
  currency:         string
  interval:         string
  slug:             string
  defaultShipping:  string
  shippingOptions:  ShippingOption[]
  orderBumps:       OrderBump[]
  reviews:          CheckoutReview[]
  logoUrl:          string
  brandName:        string
  showReviews:      boolean
  paymentMethods:   string[]
  checkoutTemplate: string
  checkoutLanguage: string
  requirePhone:     boolean
  requireAddress:   boolean
  utmfyApiToken:    string
  successUrl:       string
  metaPixelId:      string
  status:           'active' | 'archived'
}

const PAYMENT_METHODS = [
  { id: 'card',       label: 'Cartão de Crédito/Débito', desc: 'Visa, Mastercard, Amex...' },
  { id: 'apple_pay',  label: 'Apple Pay',                desc: 'Pagamento via dispositivos Apple' },
  { id: 'google_pay', label: 'Google Pay',               desc: 'Pagamento via Google Wallet' },
  { id: 'mbway',      label: 'MB WAY',                   desc: 'Pagamento via app MB WAY (Portugal)' },
  { id: 'multibanco', label: 'Multibanco',               desc: 'Referência Multibanco (Portugal)' },
  { id: 'satispay',   label: 'Satispay',                 desc: 'Pagamento via app Satispay (Itália)' },
]

const TEMPLATES = [
  { id: 'single_step',  label: 'Padrão (Clean)'    },
  { id: 'promo',        label: 'Promoção'           },
  { id: 'info_product', label: 'Produto Digital'    },
  { id: 'dropshipping', label: 'Dropshipping'       },
]

const LANGUAGES = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'English'   },
  { id: 'es', label: 'Español'   },
  { id: 'it', label: 'Italiano'  },
]

const CURRENCIES = [
  { id: 'EUR', label: '€ EUR' },
  { id: 'BRL', label: 'R$ BRL' },
  { id: 'USD', label: '$ USD' },
  { id: 'GBP', label: '£ GBP' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children, collapsible = false }: {
  title: string; children: React.ReactNode; collapsible?: boolean
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => collapsible && setOpen(o => !o)}
        className={clsx(
          'w-full flex items-center justify-between px-5 py-3.5',
          collapsible && 'hover:bg-ep-raised/50 transition-colors cursor-pointer',
          !collapsible && 'cursor-default',
        )}
      >
        <h3 className="text-ep-primary font-semibold text-sm">{title}</h3>
        {collapsible && (open
          ? <ChevronUp size={14} className="text-ep-muted" />
          : <ChevronDown size={14} className="text-ep-muted" />
        )}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-ep-border-subtle pt-4">{children}</div>}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-ep-secondary text-xs font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-ep-muted text-xs mt-1">{hint}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={clsx(
        'w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors',
        className,
      )}
    />
  )
}

function Toggle({ checked, onChange, label, desc }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-ep-primary text-sm">{label}</p>
        {desc && <p className="text-ep-muted text-xs">{desc}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-9 h-5 bg-ep-overlay rounded-full peer peer-checked:bg-ep-accent transition-colors" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-ep-base rounded-full transition-all peer-checked:translate-x-4" />
      </label>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  product?: Product | null
  onClose: () => void
  onSaved: () => void
}

function toForm(p?: Product | null): FormData {
  return {
    name:             p?.name             ?? '',
    description:      p?.description      ?? '',
    imageUrl:         p?.imageUrl         ?? '',
    price:            p ? (p.price / 100).toFixed(2) : '',
    currency:         p?.currency         ?? 'EUR',
    interval:         p?.interval         ?? 'mês',
    slug:             p?.slug             ?? '',
    defaultShipping:  p ? (p.defaultShipping / 100).toFixed(2) : '',
    shippingOptions:  p?.shippingOptions  ?? [],
    orderBumps:       p?.orderBumps       ?? [],
    reviews:          p?.reviews          ?? [],
    logoUrl:          p?.logoUrl          ?? '',
    brandName:        p?.brandName        ?? '',
    showReviews:      p?.showReviews      ?? false,
    paymentMethods:   p?.paymentMethods?.length ? p.paymentMethods : ['card'],
    checkoutTemplate: p?.checkoutTemplate ?? 'single_step',
    checkoutLanguage: p?.checkoutLanguage ?? 'pt',
    requirePhone:     p?.requirePhone     ?? false,
    requireAddress:   p?.requireAddress   ?? false,
    utmfyApiToken:    p?.utmfyApiToken    ?? '',
    successUrl:       p?.successUrl       ?? '',
    metaPixelId:      p?.metaPixelId      ?? '',
    status:           p?.status           ?? 'active',
  }
}

export default function ProductFormModal({ product, onClose, onSaved }: Props) {
  const isEdit = !!product
  const [form,    setForm]    = useState<FormData>(() => toForm(product))
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  // Novo shipping option em construção
  const [newShipLabel, setNewShipLabel] = useState('')
  const [newShipPrice, setNewShipPrice] = useState('')

  // Novo order bump em construção
  const [newBumpLabel, setNewBumpLabel] = useState('')
  const [newBumpPrice, setNewBumpPrice] = useState('')
  const [newBumpDesc,  setNewBumpDesc]  = useState('')

  // Nova review em construção
  const [newRevName,   setNewRevName]   = useState('')
  const [newRevText,   setNewRevText]   = useState('')
  const [newRevRating, setNewRevRating] = useState('5')

  useEffect(() => { setForm(toForm(product)) }, [product])

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const toggleMethod = (id: string) =>
    set('paymentMethods', form.paymentMethods.includes(id)
      ? form.paymentMethods.filter(m => m !== id)
      : [...form.paymentMethods, id])

  const addShipping = () => {
    if (!newShipLabel.trim()) return
    const price = Math.round(parseFloat(newShipPrice || '0') * 100)
    set('shippingOptions', [
      ...form.shippingOptions,
      { id: `ship_${Date.now()}`, label: newShipLabel.trim(), price },
    ])
    setNewShipLabel('')
    setNewShipPrice('')
  }

  const addBump = () => {
    if (!newBumpLabel.trim() || !newBumpPrice.trim()) return
    const price = Math.round(parseFloat(newBumpPrice) * 100)
    set('orderBumps', [
      ...form.orderBumps,
      { id: `bump_${Date.now()}`, name: newBumpLabel.trim(), description: newBumpDesc.trim(), price, currency: form.currency },
    ])
    setNewBumpLabel(''); setNewBumpPrice(''); setNewBumpDesc('')
  }

  const removeBump = (id: string) =>
    set('orderBumps', form.orderBumps.filter(b => b.id !== id))

  const addReview = () => {
    if (!newRevName.trim() || !newRevText.trim()) return
    set('reviews', [
      ...form.reviews,
      { id: `rev_${Date.now()}`, author: newRevName.trim(), comment: newRevText.trim(), rating: Number(newRevRating) },
    ])
    setNewRevName(''); setNewRevText(''); setNewRevRating('5')
  }

  const removeReview = (idx: number) =>
    set('reviews', form.reviews.filter((_, i) => i !== idx))

  const removeShipping = (id: string) =>
    set('shippingOptions', form.shippingOptions.filter(s => s.id !== id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    const priceVal = parseFloat(form.price)
    if (isNaN(priceVal) || priceVal <= 0) { setError('Preço inválido'); return }

    setSaving(true)
    try {
      const body = {
        name:             form.name.trim(),
        description:      form.description.trim(),
        imageUrl:         form.imageUrl.trim(),
        price:            Math.round(priceVal * 100),
        currency:         form.currency,
        interval:         form.interval,
        slug:             form.slug.trim() || null,
        defaultShipping:  Math.round(parseFloat(form.defaultShipping || '0') * 100),
        shippingOptions:  form.shippingOptions,
        orderBumps:       form.orderBumps,
        reviews:          form.reviews,
        logoUrl:          form.logoUrl.trim(),
        brandName:        form.brandName.trim(),
        showReviews:      form.showReviews,
        paymentMethods:   form.paymentMethods,
        checkoutTemplate: form.checkoutTemplate,
        checkoutLanguage: form.checkoutLanguage,
        requirePhone:     form.requirePhone,
        requireAddress:   form.requireAddress,
        utmfyApiToken:    form.utmfyApiToken.trim(),
        successUrl:       form.successUrl.trim(),
        metaPixelId:      form.metaPixelId.trim(),
        status:           form.status,
        stripeId:         product?.stripeId ?? '',
      }

      const url    = isEdit ? `/api/products/${product!.id}` : '/api/products'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao salvar')
        return
      }

      onSaved()
      onClose()
    } catch {
      setError('Erro de ligação. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="w-full max-w-2xl bg-ep-base rounded-2xl shadow-2xl border border-ep-border-default">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ep-border-subtle">
          <h2 className="text-ep-primary font-bold text-base">
            {isEdit ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button onClick={onClose} className="text-ep-muted hover:text-ep-primary transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Informações Básicas */}
          <Section title="Informações Básicas">
            <Field label="Nome do Produto *">
              <Input value={form.name} onChange={v => set('name', v)} placeholder="Ex: Curso de Marketing Digital" />
            </Field>
            <Field label="Descrição (opcional)">
              <textarea
                value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Descrição curta do produto"
                rows={2}
                className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors resize-none"
              />
            </Field>
            <Field label="URL da Imagem do Produto (opcional)" hint="Imagem exibida no checkout (recomendado: 400x400px)">
              <Input value={form.imageUrl} onChange={v => set('imageUrl', v)} placeholder="https://seusite.com/produto.jpg" />
            </Field>
          </Section>

          {/* Preço */}
          <Section title="Preço">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preço *">
                <Input value={form.price} onChange={v => set('price', v)} placeholder="29.90" type="number" />
              </Field>
              <Field label="Moeda *">
                <select value={form.currency} onChange={e => set('currency', e.target.value)}
                  className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm focus:outline-none focus:border-ep-accent appearance-none">
                  {CURRENCIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Intervalo">
                <select value={form.interval} onChange={e => set('interval', e.target.value)}
                  className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm focus:outline-none focus:border-ep-accent appearance-none">
                  <option value="unit">Pagamento único</option>
                  <option value="mês">Mensal</option>
                  <option value="ano">Anual</option>
                </select>
              </Field>
              <Field label="Slug (URL do checkout)" hint="/checkout/[slug]">
                <Input value={form.slug} onChange={v => set('slug', v)} placeholder="meu-produto" />
              </Field>
            </div>
            <Field label="Frete Padrão (opcional)" hint="Usado quando não há opções de envio. Deixe vazio para frete grátis.">
              <Input value={form.defaultShipping} onChange={v => set('defaultShipping', v)} placeholder="0.00" type="number" />
            </Field>
          </Section>

          {/* Opções de Envio */}
          <Section title="Opções de Envio" collapsible>
            <p className="text-ep-muted text-xs">Adicione opções de envio para o cliente escolher no checkout.</p>
            {form.shippingOptions.map(opt => (
              <div key={opt.id} className="flex items-center gap-2 p-2.5 bg-ep-raised rounded-lg border border-ep-border-default">
                <span className="flex-1 text-ep-primary text-sm">{opt.label}</span>
                <span className="text-ep-accent text-sm font-medium">
                  {opt.price === 0 ? 'Grátis' : `${(opt.price / 100).toFixed(2)} ${form.currency}`}
                </span>
                <button type="button" onClick={() => removeShipping(opt.id)}
                  className="text-ep-muted hover:text-ep-danger transition-colors p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={newShipLabel} onChange={e => setNewShipLabel(e.target.value)}
                placeholder="Ex: Envio Standard"
                className="flex-1 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
              <input value={newShipPrice} onChange={e => setNewShipPrice(e.target.value)}
                placeholder="4.99" type="number"
                className="w-24 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
              <button type="button" onClick={addShipping}
                className="flex items-center gap-1 px-3 py-2 bg-ep-accent text-ep-base rounded-lg text-xs font-semibold hover:bg-ep-accent-dark transition-colors">
                <Plus size={13} /> Adicionar
              </button>
            </div>
          </Section>

          {/* Branding */}
          <Section title="Branding do Checkout" collapsible>
            <Field label="URL do Logo (opcional)" hint="Logo exibido no cabeçalho do checkout (altura recomendada: 32px)">
              <Input value={form.logoUrl} onChange={v => set('logoUrl', v)} placeholder="https://seusite.com/logo.png" />
            </Field>
            <Field label="Nome da Marca (opcional)" hint="Exibido ao lado do logo ou como texto alternativo">
              <Input value={form.brandName} onChange={v => set('brandName', v)} placeholder="Nome da sua marca" />
            </Field>
          </Section>

          {/* Order Bumps */}
          <Section title="Order Bumps" collapsible>
            <p className="text-ep-muted text-xs">Ofertas adicionais exibidas antes do pagamento para aumentar o ticket médio.</p>
            {form.orderBumps.map(bump => (
              <div key={bump.id} className="flex items-center gap-2 p-2.5 bg-ep-raised rounded-lg border border-ep-border-default">
                <div className="flex-1 min-w-0">
                  <p className="text-ep-primary text-sm font-medium truncate">{bump.name}</p>
                  {bump.description && <p className="text-ep-muted text-xs truncate">{bump.description}</p>}
                </div>
                <span className="text-ep-accent text-sm font-medium flex-shrink-0">
                  {bump.price === 0 ? 'Grátis' : `+${(bump.price / 100).toFixed(2)} ${form.currency}`}
                </span>
                <button type="button" onClick={() => removeBump(bump.id)}
                  className="text-ep-muted hover:text-ep-danger transition-colors p-1 flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={newBumpLabel} onChange={e => setNewBumpLabel(e.target.value)}
                  placeholder="Nome do bump (ex: Garantia Estendida)"
                  className="flex-1 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
                <input value={newBumpPrice} onChange={e => setNewBumpPrice(e.target.value)}
                  placeholder="9.99" type="number"
                  className="w-24 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
              </div>
              <div className="flex gap-2">
                <input value={newBumpDesc} onChange={e => setNewBumpDesc(e.target.value)}
                  placeholder="Descrição curta (opcional)"
                  className="flex-1 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
                <button type="button" onClick={addBump}
                  className="flex items-center gap-1 px-3 py-2 bg-ep-accent text-ep-base rounded-lg text-xs font-semibold hover:bg-ep-accent-dark transition-colors flex-shrink-0">
                  <Plus size={13} /> Adicionar
                </button>
              </div>
            </div>
          </Section>

          {/* Avaliações */}
          <Section title="Avaliações / Depoimentos" collapsible>
            <Toggle
              checked={form.showReviews}
              onChange={v => set('showReviews', v)}
              label="Exibir avaliações no checkout"
              desc="Mostra avaliações para aumentar a confiança"
            />
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
                <button type="button" onClick={() => removeReview(idx)}
                  className="text-ep-muted hover:text-ep-danger transition-colors p-1 flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={newRevName} onChange={e => setNewRevName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="flex-1 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
                <select value={newRevRating} onChange={e => setNewRevRating(e.target.value)}
                  className="w-20 px-2 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm focus:outline-none focus:border-ep-accent appearance-none">
                  {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input value={newRevText} onChange={e => setNewRevText(e.target.value)}
                  placeholder="Texto da avaliação"
                  className="flex-1 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
                <button type="button" onClick={addReview}
                  className="flex items-center gap-1 px-3 py-2 bg-ep-accent text-ep-base rounded-lg text-xs font-semibold hover:bg-ep-accent-dark transition-colors flex-shrink-0">
                  <Plus size={13} /> Adicionar
                </button>
              </div>
            </div>
          </Section>

          {/* Métodos de Pagamento */}
          <Section title="Métodos de Pagamento">
            <p className="text-ep-muted text-xs">Selecione os métodos de pagamento disponíveis neste produto.</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map(m => (
                <label key={m.id} className={clsx(
                  'flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  form.paymentMethods.includes(m.id)
                    ? 'border-ep-accent bg-ep-accent/5'
                    : 'border-ep-border-default hover:border-ep-accent/40',
                )}>
                  <div>
                    <p className="text-ep-primary text-sm font-medium">{m.label}</p>
                    <p className="text-ep-muted text-xs">{m.desc}</p>
                  </div>
                  <input type="checkbox" checked={form.paymentMethods.includes(m.id)}
                    onChange={() => toggleMethod(m.id)}
                    className="w-4 h-4 accent-ep-accent flex-shrink-0" />
                </label>
              ))}
            </div>
          </Section>

          {/* Configurações do Checkout */}
          <Section title="Configurações do Checkout" collapsible>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Template do Checkout">
                <select value={form.checkoutTemplate} onChange={e => set('checkoutTemplate', e.target.value)}
                  className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm focus:outline-none focus:border-ep-accent appearance-none">
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Idioma do Checkout *">
                <select value={form.checkoutLanguage} onChange={e => set('checkoutLanguage', e.target.value)}
                  className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm focus:outline-none focus:border-ep-accent appearance-none">
                  {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </Field>
            </div>
            <Toggle checked={form.requirePhone} onChange={v => set('requirePhone', v)}
              label="Exigir Telefone" desc="Solicitar número de telefone no checkout" />
            <Toggle checked={form.requireAddress} onChange={v => set('requireAddress', v)}
              label="Exigir Endereço" desc="Solicitar endereço completo no checkout" />
          </Section>

          {/* UTMFY */}
          <Section title="Integração UTMFY" collapsible>
            <Field label="Credencial de API da UTMFY (opcional)"
              hint="Ao configurar, cada venda paga será enviada automaticamente para a UTMFY como pagamento via Pix.">
              <Input value={form.utmfyApiToken} onChange={v => set('utmfyApiToken', v)} placeholder="Cole aqui sua credencial de API" />
            </Field>
          </Section>

          {/* Avançado */}
          <Section title="Avançado" collapsible>
            <Field label="URL de Sucesso (opcional)" hint="Redireciona após pagamento confirmado. Deixe vazio para usar a página padrão.">
              <Input value={form.successUrl} onChange={v => set('successUrl', v)} placeholder="https://seusite.com/obrigado" />
            </Field>
            <Field label="Meta Pixel ID (opcional)" hint="Para rastreamento de conversões do Facebook/Meta">
              <Input value={form.metaPixelId} onChange={v => set('metaPixelId', v)} placeholder="123456789012345" />
            </Field>
            <Toggle checked={form.status === 'active'} onChange={v => set('status', v ? 'active' : 'archived')}
              label="Ativo" desc="Produtos inativos não aparecem no checkout" />
          </Section>

          {error && (
            <div className="bg-ep-danger/10 border border-ep-danger/20 rounded-lg p-3 text-ep-danger text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-ep-secondary hover:text-ep-primary text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-ep-accent text-ep-base rounded-lg text-sm font-semibold hover:bg-ep-accent-dark transition-colors disabled:opacity-60">
              {saving ? 'A salvar…' : isEdit ? 'Salvar alterações' : 'Criar produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
