'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plug, Save, Check, ExternalLink, Plus, Trash2, Edit2, X, Eye, EyeOff, Copy, Webhook } from 'lucide-react'
import Image from 'next/image'
import clsx from 'clsx'
import { ListRowSkeleton } from '@/components/ui/Skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntegrationSettings {
  pushcutWebhookUrl: string
  utmifyApiToken: string
}

interface OutboundWebhook {
  id:         string
  name:       string
  url:        string
  secret:     string
  events:     string[]
  productIds: string[]
  enabled:    boolean
  createdAt:  string
}

const AVAILABLE_EVENTS = [
  { value: 'payment.succeeded', label: 'Pagamento aprovado' },
  { value: 'payment.failed',    label: 'Pagamento falhado'  },
]

const emptyForm = { name: '', url: '', events: ['payment.succeeded'], productIds: [] as string[], enabled: true }

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-ep-secondary text-xs font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-ep-muted text-xs mt-1">{hint}</p>}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
    />
  )
}

// ─── IntegrationCard ──────────────────────────────────────────────────────────

interface CardProps {
  icon: React.ReactNode
  title: string
  description: string
  docsUrl?: string
  children: React.ReactNode
  onSave: () => Promise<void>
  saving: boolean
  saved: boolean
}

function IntegrationCard({ icon, title, description, docsUrl, children, onSave, saving, saved }: CardProps) {
  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 border-b border-ep-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ep-raised border border-ep-border-default flex items-center justify-center flex-shrink-0 overflow-hidden">
            {icon}
          </div>
          <div>
            <h3 className="text-ep-primary font-semibold text-sm">{title}</h3>
            <p className="text-ep-muted text-xs mt-0.5">{description}</p>
          </div>
        </div>
        {docsUrl && (
          <a href={docsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-ep-muted hover:text-ep-accent text-xs transition-colors flex-shrink-0 mt-1">
            <ExternalLink size={11} />Docs
          </a>
        )}
      </div>
      <div className="px-5 py-5 space-y-4">
        {children}
        <div className="flex justify-end pt-1">
          <button onClick={onSave} disabled={saving}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all',
              saved
                ? 'bg-ep-success/20 border border-ep-success/30 text-ep-success'
                : 'bg-ep-accent text-ep-base hover:bg-ep-accent-dark disabled:opacity-60',
            )}>
            {saved ? <Check size={12} /> : <Save size={12} />}
            {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── WebhooksSection ──────────────────────────────────────────────────────────

function WebhooksSection() {
  const [webhooks,   setWebhooks]   = useState<OutboundWebhook[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [form,       setForm]       = useState(emptyForm)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [copied,     setCopied]     = useState<string | null>(null)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/webhooks')
      const data = await res.json() as OutboundWebhook[]
      setWebhooks(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditId(null); setForm(emptyForm); setError(''); setShowForm(true) }
  const openEdit   = (wh: OutboundWebhook) => {
    setEditId(wh.id)
    setForm({ name: wh.name, url: wh.url, events: wh.events, productIds: wh.productIds, enabled: wh.enabled })
    setError(''); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) { setError('Nome e URL são obrigatórios'); return }
    setSaving(true); setError('')
    try {
      const res = editId
        ? await fetch(`/api/webhooks/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch('/api/webhooks',            { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro ao guardar'); return }
      setShowForm(false); await load()
    } finally { setSaving(false) }
  }

  const handleToggle = async (wh: OutboundWebhook) => {
    await fetch(`/api/webhooks/${wh.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !wh.enabled }) })
    await load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    setDeleteId(null); await load()
  }

  const copySecret = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000) })
  }

  const toggleEvent = (ev: string) =>
    setForm(f => ({ ...f, events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev] }))

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
      <div className="flex items-start justify-between px-5 py-4 border-b border-ep-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ep-raised border border-ep-border-default flex items-center justify-center flex-shrink-0">
            <Webhook size={16} className="text-ep-accent" />
          </div>
          <div>
            <h3 className="text-ep-primary font-semibold text-sm">Webhooks</h3>
            <p className="text-ep-muted text-xs mt-0.5">Receba notificações HTTP quando ocorrem eventos de pagamento</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-accent text-ep-base text-xs font-semibold rounded-md hover:bg-ep-accent-dark transition-colors flex-shrink-0">
          <Plus size={12} />Novo
        </button>
      </div>

      <div className="px-5 py-5 space-y-4">
        {showForm && (
          <div className="bg-ep-raised border border-ep-border-default rounded-lg p-4 space-y-3">
            <h4 className="text-ep-primary font-semibold text-xs">{editId ? 'Editar webhook' : 'Novo webhook'}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-ep-secondary text-xs mb-1">Nome</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Meu servidor"
                  className="w-full px-3 py-2 bg-ep-surface border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors" />
              </div>
              <div>
                <label className="block text-ep-secondary text-xs mb-1">URL do endpoint</label>
                <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://meusite.com/webhook"
                  className="w-full px-3 py-2 bg-ep-surface border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-ep-secondary text-xs mb-2">Eventos</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EVENTS.map(ev => (
                  <button key={ev.value} type="button" onClick={() => toggleEvent(ev.value)}
                    className={clsx('px-3 py-1.5 rounded-md text-xs font-medium border transition-all',
                      form.events.includes(ev.value)
                        ? 'bg-ep-accent text-ep-base border-ep-accent'
                        : 'bg-ep-surface text-ep-secondary border-ep-border-default hover:border-ep-accent')}>
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-ep-danger text-xs">{error}</p>}
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-accent text-ep-base text-xs font-semibold rounded-md hover:bg-ep-accent-dark disabled:opacity-50 transition-colors">
                <Check size={12} />{saving ? 'A guardar…' : 'Guardar'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-surface border border-ep-border-default text-ep-secondary text-xs rounded-md hover:text-ep-primary transition-colors">
                <X size={12} />Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="divide-y divide-ep-border-subtle">
            {Array.from({ length: 2 }).map((_, i) => <ListRowSkeleton key={i} cols={3} />)}
          </div>
        ) : webhooks.length === 0 && !showForm ? (
          <div className="py-8 flex flex-col items-center gap-2">
            <Webhook size={24} className="text-ep-muted opacity-40" />
            <p className="text-ep-secondary text-sm">Nenhum webhook configurado</p>
            <button onClick={openCreate} className="text-ep-accent text-xs hover:underline">Criar o primeiro</button>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map(wh => (
              <div key={wh.id} className="bg-ep-raised border border-ep-border-default rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-ep-primary text-sm font-semibold">{wh.name}</span>
                      <span className={clsx('inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium border',
                        wh.enabled ? 'text-ep-success bg-ep-success/10 border-ep-success/20' : 'text-ep-muted bg-ep-surface border-ep-border-default')}>
                        {wh.enabled ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <p className="text-ep-muted text-xs font-mono truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {wh.events.map(ev => (
                        <span key={ev} className="px-1.5 py-0.5 bg-ep-surface border border-ep-border-subtle rounded text-xs text-ep-secondary">{ev}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggle(wh)} title={wh.enabled ? 'Desativar' : 'Ativar'}
                      className="p-1.5 rounded text-ep-muted hover:text-ep-primary transition-colors">
                      {wh.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => openEdit(wh)} title="Editar"
                      className="p-1.5 rounded text-ep-muted hover:text-ep-primary transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleteId(wh.id)} title="Eliminar"
                      className="p-1.5 rounded text-ep-muted hover:text-ep-danger transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-ep-muted text-xs">Secret:</span>
                  <code className="text-xs font-mono text-ep-secondary bg-ep-surface px-2 py-0.5 rounded border border-ep-border-subtle flex-1 truncate">
                    {showSecret[wh.id] ? wh.secret : '••••••••••••••••••••••••'}
                  </code>
                  <button onClick={() => setShowSecret(s => ({ ...s, [wh.id]: !s[wh.id] }))}
                    className="p-1 text-ep-muted hover:text-ep-primary transition-colors">
                    {showSecret[wh.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button onClick={() => copySecret(wh.id, wh.secret)}
                    className="p-1 text-ep-muted hover:text-ep-primary transition-colors">
                    {copied === wh.id ? <Check size={12} className="text-ep-success" /> : <Copy size={12} />}
                  </button>
                </div>
                {deleteId === wh.id && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-ep-danger/10 border border-ep-danger/20 rounded-md">
                    <p className="text-ep-danger text-xs flex-1">Eliminar este webhook? Esta ação não pode ser desfeita.</p>
                    <button onClick={() => handleDelete(wh.id)}
                      className="px-3 py-1 bg-ep-danger text-white text-xs rounded hover:opacity-90 transition-opacity">Eliminar</button>
                    <button onClick={() => setDeleteId(null)}
                      className="px-3 py-1 bg-ep-surface border border-ep-border-default text-ep-secondary text-xs rounded hover:text-ep-primary transition-colors">Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegracoesPage() {
  const [settings, setSettings] = useState<IntegrationSettings>({ pushcutWebhookUrl: '', utmifyApiToken: '' })
  const [loading,  setLoading]  = useState(true)
  const [savingPushcut, setSavingPushcut] = useState(false)
  const [savedPushcut,  setSavedPushcut]  = useState(false)
  const [savingUtmify,  setSavingUtmify]  = useState(false)
  const [savedUtmify,   setSavedUtmify]   = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings({ pushcutWebhookUrl: data.pushcutWebhookUrl ?? '', utmifyApiToken: data.utmifyApiToken ?? '' })
        setLoading(false)
      })
      .catch(() => { setError('Erro ao carregar configurações'); setLoading(false) })
  }, [])

  const savePushcut = async () => {
    setSavingPushcut(true)
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pushcutWebhookUrl: settings.pushcutWebhookUrl }) })
      if (!res.ok) throw new Error()
      setSavedPushcut(true); setTimeout(() => setSavedPushcut(false), 2000)
    } catch { setError('Erro ao salvar Pushcut') } finally { setSavingPushcut(false) }
  }

  const saveUtmify = async () => {
    setSavingUtmify(true)
    try {
      const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ utmifyApiToken: settings.utmifyApiToken }) })
      if (!res.ok) throw new Error()
      setSavedUtmify(true); setTimeout(() => setSavedUtmify(false), 2000)
    } catch { setError('Erro ao salvar UTMify') } finally { setSavingUtmify(false) }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-40 bg-ep-raised rounded animate-pulse" />
        <div className="h-4 w-64 bg-ep-raised rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-ep-primary text-lg md:text-xl font-bold flex items-center gap-2">
          <Plug size={20} className="text-ep-accent" />
          Integrações
        </h1>
        <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
          Conecte ferramentas externas para notificações, rastreamento e automações
        </p>
      </div>

      {error && (
        <div className="bg-ep-danger/10 border border-ep-danger/20 rounded-lg p-3 text-ep-danger text-sm">{error}</div>
      )}

      <IntegrationCard
        icon={<Image src="/pushcut-icon.png" alt="Pushcut" width={28} height={28} className="rounded-md object-contain" />}
        title="Pushcut"
        description="Receba notificações push no iPhone quando ocorrerem vendas, falhas ou reembolsos"
        docsUrl="https://www.pushcut.io/support.html"
        onSave={savePushcut} saving={savingPushcut} saved={savedPushcut}
      >
        <Field label="Webhook URL" hint="Cole a URL do webhook gerada no app Pushcut em Automations → Webhook">
          <TextInput value={settings.pushcutWebhookUrl} onChange={v => setSettings(s => ({ ...s, pushcutWebhookUrl: v }))}
            placeholder="https://api.pushcut.io/xxxxxxxx/notifications/..." />
        </Field>
        <div className="bg-ep-raised border border-ep-border-subtle rounded-lg p-3 space-y-1.5">
          <p className="text-ep-secondary text-xs font-medium">Eventos enviados</p>
          {[
            { label: 'Venda aprovada',   desc: 'Dispara quando um pagamento é confirmado' },
            { label: 'Pagamento falhou', desc: 'Dispara quando um pagamento é recusado'   },
            { label: 'Reembolso',        desc: 'Dispara quando um reembolso é processado' },
          ].map(e => (
            <div key={e.label} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-ep-accent mt-1.5 flex-shrink-0" />
              <div>
                <span className="text-ep-primary text-xs font-medium">{e.label}</span>
                <span className="text-ep-muted text-xs"> — {e.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </IntegrationCard>

      <IntegrationCard
        icon={<Image src="/utmify-icon.png" alt="UTMify" width={28} height={28} className="rounded-md object-contain" />}
        title="UTMify"
        description="Envie dados de pedidos para o UTMify e rastreie a performance das suas campanhas de tráfego"
        docsUrl="https://utmify.com.br"
        onSave={saveUtmify} saving={savingUtmify} saved={savedUtmify}
      >
        <Field label="API Token" hint="Encontre seu token em UTMify → Configurações → API">
          <TextInput value={settings.utmifyApiToken} onChange={v => setSettings(s => ({ ...s, utmifyApiToken: v }))}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" type="password" />
        </Field>
        <div className="bg-ep-raised border border-ep-border-subtle rounded-lg p-3 space-y-1.5">
          <p className="text-ep-secondary text-xs font-medium">O que é enviado</p>
          {[
            { label: 'Dados do pedido',  desc: 'ID, valor, método de pagamento e status'          },
            { label: 'Dados do cliente', desc: 'Nome, email e telefone'                            },
            { label: 'Parâmetros UTM',   desc: 'utm_source, utm_medium, utm_campaign, src, sck'   },
            { label: 'Comissão',         desc: 'Valor bruto, taxa do gateway e valor líquido'      },
          ].map(e => (
            <div key={e.label} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-ep-accent mt-1.5 flex-shrink-0" />
              <div>
                <span className="text-ep-primary text-xs font-medium">{e.label}</span>
                <span className="text-ep-muted text-xs"> — {e.desc}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-ep-muted text-xs">
          O token global é usado como fallback. Produtos com token próprio continuam usando o token do produto.
        </p>
      </IntegrationCard>

      <WebhooksSection />
    </div>
  )
}
