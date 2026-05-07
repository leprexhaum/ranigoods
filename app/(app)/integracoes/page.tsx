'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plug, Save, Check, ExternalLink, Plus, Trash2, Edit2, X,
  Eye, EyeOff, Copy, Webhook, ChevronDown, ChevronUp,
} from 'lucide-react'
import Image from 'next/image'
import clsx from 'clsx'
import { ListRowSkeleton } from '@/components/ui/Skeleton'
import { Toggle } from '@/components/ui/Toggle'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PushcutConfig {
  id: string; name: string; webhookUrl: string; events: string[]; enabled: boolean
}
interface UtmifyConfig {
  id: string; name: string; apiToken: string; enabled: boolean
}
interface OutboundWebhook {
  id: string; name: string; url: string; secret: string; events: string[]; productIds: string[]; enabled: boolean
}

const PUSHCUT_EVENTS = [
  { value: 'payment.succeeded', label: '✅ Venda aprovada'    },
  { value: 'payment.failed',    label: '❌ Pagamento falhado' },
  { value: 'payment.refunded',  label: '↩️ Reembolso'         },
]

const WEBHOOK_EVENTS = [
  { value: 'payment.succeeded', label: 'Pagamento aprovado' },
  { value: 'payment.failed',    label: 'Pagamento falhado'  },
  { value: 'payment.refunded',  label: 'Reembolso'          },
]

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, description, docsUrl, action }: {
  icon: React.ReactNode; title: string; description: string; docsUrl?: string; action?: React.ReactNode
}) {
  return (
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
      <div className="flex items-center gap-2 flex-shrink-0">
        {docsUrl && (
          <a href={docsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-ep-muted hover:text-ep-accent text-xs transition-colors">
            <ExternalLink size={11} />Docs
          </a>
        )}
        {action}
      </div>
    </div>
  )
}

function FormInput({ label, value, onChange, placeholder, type = 'text', hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-ep-secondary text-xs mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 bg-ep-surface border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors" />
      {hint && <p className="text-ep-muted text-xs mt-1">{hint}</p>}
    </div>
  )
}

function EventPills({ events, selected, onChange }: {
  events: { value: string; label: string }[]; selected: string[]; onChange: (v: string[]) => void
}) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(e => e !== v) : [...selected, v])
  return (
    <div className="flex flex-wrap gap-2">
      {events.map(ev => (
        <button key={ev.value} type="button" onClick={() => toggle(ev.value)}
          className={clsx('px-3 py-1.5 rounded-md text-xs font-medium border transition-all',
            selected.includes(ev.value)
              ? 'bg-ep-accent text-ep-base border-ep-accent'
              : 'bg-ep-raised text-ep-secondary border-ep-border-default hover:border-ep-accent')}>
          {ev.label}
        </button>
      ))}
    </div>
  )
}

// ─── PushcutSection ───────────────────────────────────────────────────────────

function PushcutSection() {
  const [configs,   setConfigs]   = useState<PushcutConfig[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [form,      setForm]      = useState({ name: '', webhookUrl: '', events: ['payment.succeeded'] as string[] })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [expanded,  setExpanded]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/pushcut')
      setConfigs(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditId(null); setForm({ name: '', webhookUrl: '', events: ['payment.succeeded'] }); setError(''); setShowForm(true) }
  const openEdit   = (c: PushcutConfig) => { setEditId(c.id); setForm({ name: c.name, webhookUrl: c.webhookUrl, events: c.events }); setError(''); setShowForm(true) }

  const handleSave = async () => {
    if (!form.webhookUrl.trim()) { setError('URL é obrigatória'); return }
    setSaving(true); setError('')
    try {
      const res = editId
        ? await fetch(`/api/integrations/pushcut/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch('/api/integrations/pushcut',           { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro'); return }
      setShowForm(false); await load()
    } finally { setSaving(false) }
  }

  const handleToggle = async (c: PushcutConfig) => {
    await fetch(`/api/integrations/pushcut/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !c.enabled }) })
    await load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/integrations/pushcut/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
      <SectionHeader
        icon={<Image src="/pushcut-icon.png" alt="Pushcut" width={28} height={28} className="object-contain" />}
        title="Pushcut"
        description="Notificações push no iPhone para vendas, falhas e reembolsos"
        docsUrl="https://www.pushcut.io/support.html"
        action={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-accent text-ep-base text-xs font-semibold rounded-md hover:bg-ep-accent-dark transition-colors">
            <Plus size={12} />Adicionar
          </button>
        }
      />
      <div className="px-5 py-5 space-y-3">
        {showForm && (
          <div className="bg-ep-raised border border-ep-border-default rounded-lg p-4 space-y-3">
            <h4 className="text-ep-primary font-semibold text-xs">{editId ? 'Editar' : 'Nova config'}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput label="Nome (opcional)" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Ex: iPhone principal" />
              <FormInput label="Webhook URL" value={form.webhookUrl} onChange={v => setForm(f => ({ ...f, webhookUrl: v }))} placeholder="https://api.pushcut.io/..." />
            </div>
            <div>
              <label className="block text-ep-secondary text-xs mb-2">Eventos</label>
              <EventPills events={PUSHCUT_EVENTS} selected={form.events} onChange={v => setForm(f => ({ ...f, events: v }))} />
            </div>
            {error && <p className="text-ep-danger text-xs">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-accent text-ep-base text-xs font-semibold rounded-md hover:bg-ep-accent-dark disabled:opacity-50 transition-colors">
                <Check size={12} />{saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-surface border border-ep-border-default text-ep-secondary text-xs rounded-md hover:text-ep-primary transition-colors">
                <X size={12} />Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div><ListRowSkeleton cols={2} /><ListRowSkeleton cols={2} /></div>
        ) : configs.length === 0 && !showForm ? (
          <div className="py-6 text-center">
            <p className="text-ep-secondary text-sm">Nenhuma config Pushcut</p>
            <button onClick={openCreate} className="text-ep-accent text-xs hover:underline mt-1">Adicionar primeira</button>
          </div>
        ) : (
          <div className="space-y-2">
            {configs.map(c => (
              <div key={c.id} className="bg-ep-raised border border-ep-border-default rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Toggle checked={c.enabled} onChange={() => handleToggle(c)} label="Ativo" />
                    <div className="min-w-0">
                      <p className="text-ep-primary text-xs font-semibold truncate">{c.name || 'Sem nome'}</p>
                      <p className="text-ep-muted text-xs font-mono truncate">{c.webhookUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="p-1.5 text-ep-muted hover:text-ep-primary transition-colors">
                      {expanded === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button onClick={() => openEdit(c)} className="p-1.5 text-ep-muted hover:text-ep-primary transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-ep-muted hover:text-ep-danger transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
                {expanded === c.id && (
                  <div className="px-4 pb-3 border-t border-ep-border-subtle pt-2">
                    <p className="text-ep-muted text-xs mb-1.5">Eventos ativos:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PUSHCUT_EVENTS.map(ev => (
                        <span key={ev.value} className={clsx('px-2 py-0.5 rounded text-xs border',
                          c.events.includes(ev.value)
                            ? 'bg-ep-accent/10 border-ep-accent/30 text-ep-accent'
                            : 'bg-ep-surface border-ep-border-subtle text-ep-muted opacity-50')}>
                          {ev.label}
                        </span>
                      ))}
                    </div>
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

// ─── UtmifySection ────────────────────────────────────────────────────────────

function UtmifySection() {
  const [configs,  setConfigs]  = useState<UtmifyConfig[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [form,     setForm]     = useState({ name: '', apiToken: '' })
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [showToken, setShowToken] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/utmify')
      setConfigs(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditId(null); setForm({ name: '', apiToken: '' }); setError(''); setShowForm(true) }
  const openEdit   = (c: UtmifyConfig) => { setEditId(c.id); setForm({ name: c.name, apiToken: c.apiToken }); setError(''); setShowForm(true) }

  const handleSave = async () => {
    if (!form.apiToken.trim()) { setError('API Token é obrigatório'); return }
    setSaving(true); setError('')
    try {
      const res = editId
        ? await fetch(`/api/integrations/utmify/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch('/api/integrations/utmify',           { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro'); return }
      setShowForm(false); await load()
    } finally { setSaving(false) }
  }

  const handleToggle = async (c: UtmifyConfig) => {
    await fetch(`/api/integrations/utmify/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !c.enabled }) })
    await load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/integrations/utmify/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
      <SectionHeader
        icon={<Image src="/utmify-icon.png" alt="UTMify" width={28} height={28} className="object-contain" />}
        title="UTMify"
        description="Rastreamento de campanhas — vincule configs aos produtos individualmente"
        docsUrl="https://utmify.com.br"
        action={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-accent text-ep-base text-xs font-semibold rounded-md hover:bg-ep-accent-dark transition-colors">
            <Plus size={12} />Adicionar
          </button>
        }
      />
      <div className="px-5 py-5 space-y-3">
        {showForm && (
          <div className="bg-ep-raised border border-ep-border-default rounded-lg p-4 space-y-3">
            <h4 className="text-ep-primary font-semibold text-xs">{editId ? 'Editar' : 'Nova config'}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput label="Nome (opcional)" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Ex: Conta principal" />
              <FormInput label="API Token" value={form.apiToken} onChange={v => setForm(f => ({ ...f, apiToken: v }))} placeholder="xxxxxxxxxxxxxxxx" type="password"
                hint="Encontre em UTMify → Configurações → API" />
            </div>
            {error && <p className="text-ep-danger text-xs">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-accent text-ep-base text-xs font-semibold rounded-md hover:bg-ep-accent-dark disabled:opacity-50 transition-colors">
                <Check size={12} />{saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-surface border border-ep-border-default text-ep-secondary text-xs rounded-md hover:text-ep-primary transition-colors">
                <X size={12} />Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div><ListRowSkeleton cols={2} /><ListRowSkeleton cols={2} /></div>
        ) : configs.length === 0 && !showForm ? (
          <div className="py-6 text-center">
            <p className="text-ep-secondary text-sm">Nenhuma config UTMify</p>
            <button onClick={openCreate} className="text-ep-accent text-xs hover:underline mt-1">Adicionar primeira</button>
          </div>
        ) : (
          <div className="space-y-2">
            {configs.map(c => (
              <div key={c.id} className="bg-ep-raised border border-ep-border-default rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Toggle checked={c.enabled} onChange={() => handleToggle(c)} label="Ativo" />
                  <div className="min-w-0">
                    <p className="text-ep-primary text-xs font-semibold truncate">{c.name || 'Sem nome'}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <code className="text-ep-muted text-xs font-mono">
                        {showToken[c.id] ? c.apiToken : '••••••••••••••••'}
                      </code>
                      <button onClick={() => setShowToken(s => ({ ...s, [c.id]: !s[c.id] }))}
                        className="p-0.5 text-ep-muted hover:text-ep-primary transition-colors">
                        {showToken[c.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-ep-muted hover:text-ep-primary transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-ep-muted hover:text-ep-danger transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-ep-muted text-xs pt-1">
          Após criar uma config, vá em <strong className="text-ep-secondary">Produtos → Editar → Integração UTMify</strong> para vincular ao produto desejado.
        </p>
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
  const [form,       setForm]       = useState({ name: '', url: '', events: ['payment.succeeded'] as string[], productIds: [] as string[], enabled: true })
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
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditId(null); setForm({ name: '', url: '', events: ['payment.succeeded'], productIds: [], enabled: true }); setError(''); setShowForm(true) }
  const openEdit   = (wh: OutboundWebhook) => { setEditId(wh.id); setForm({ name: wh.name, url: wh.url, events: wh.events, productIds: wh.productIds, enabled: wh.enabled }); setError(''); setShowForm(true) }

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) { setError('Nome e URL são obrigatórios'); return }
    setSaving(true); setError('')
    try {
      const res = editId
        ? await fetch(`/api/webhooks/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch('/api/webhooks',            { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro'); return }
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

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
      <SectionHeader
        icon={<div className="w-7 h-7 flex items-center justify-center"><Webhook size={16} className="text-ep-accent" /></div>}
        title="Webhooks"
        description="Notificações HTTP para sistemas externos quando ocorrem eventos de pagamento"
        action={
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ep-accent text-ep-base text-xs font-semibold rounded-md hover:bg-ep-accent-dark transition-colors">
            <Plus size={12} />Adicionar
          </button>
        }
      />
      <div className="px-5 py-5 space-y-3">
        {showForm && (
          <div className="bg-ep-raised border border-ep-border-default rounded-lg p-4 space-y-3">
            <h4 className="text-ep-primary font-semibold text-xs">{editId ? 'Editar webhook' : 'Novo webhook'}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput label="Nome" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Ex: Meu servidor" />
              <FormInput label="URL do endpoint" value={form.url} onChange={v => setForm(f => ({ ...f, url: v }))} placeholder="https://meusite.com/webhook" />
            </div>
            <div>
              <label className="block text-ep-secondary text-xs mb-2">Eventos</label>
              <EventPills events={WEBHOOK_EVENTS} selected={form.events} onChange={v => setForm(f => ({ ...f, events: v }))} />
            </div>
            {error && <p className="text-ep-danger text-xs">{error}</p>}
            <div className="flex gap-2">
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
          <div><ListRowSkeleton cols={3} /><ListRowSkeleton cols={3} /></div>
        ) : webhooks.length === 0 && !showForm ? (
          <div className="py-6 text-center">
            <Webhook size={24} className="text-ep-muted opacity-40 mx-auto mb-2" />
            <p className="text-ep-secondary text-sm">Nenhum webhook configurado</p>
            <button onClick={openCreate} className="text-ep-accent text-xs hover:underline mt-1">Criar o primeiro</button>
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map(wh => (
              <div key={wh.id} className="bg-ep-raised border border-ep-border-default rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Toggle checked={wh.enabled} onChange={() => handleToggle(wh)} label="Ativo" />
                    <div className="min-w-0">
                      <p className="text-ep-primary text-xs font-semibold">{wh.name}</p>
                      <p className="text-ep-muted text-xs font-mono truncate">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wh.events.map(ev => (
                          <span key={ev} className="px-1.5 py-0.5 bg-ep-surface border border-ep-border-subtle rounded text-xs text-ep-secondary">{ev}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(wh)} className="p-1.5 text-ep-muted hover:text-ep-primary transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => setDeleteId(wh.id)} className="p-1.5 text-ep-muted hover:text-ep-danger transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-ep-muted text-xs">Secret:</span>
                  <code className="text-xs font-mono text-ep-secondary bg-ep-surface px-2 py-0.5 rounded border border-ep-border-subtle flex-1 truncate">
                    {showSecret[wh.id] ? wh.secret : '••••••••••••••••••••••••'}
                  </code>
                  <button onClick={() => setShowSecret(s => ({ ...s, [wh.id]: !s[wh.id] }))} className="p-1 text-ep-muted hover:text-ep-primary transition-colors">
                    {showSecret[wh.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button onClick={() => copySecret(wh.id, wh.secret)} className="p-1 text-ep-muted hover:text-ep-primary transition-colors">
                    {copied === wh.id ? <Check size={12} className="text-ep-success" /> : <Copy size={12} />}
                  </button>
                </div>
                {deleteId === wh.id && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-ep-danger/10 border border-ep-danger/20 rounded-md">
                    <p className="text-ep-danger text-xs flex-1">Eliminar este webhook?</p>
                    <button onClick={() => handleDelete(wh.id)} className="px-3 py-1 bg-ep-danger text-white text-xs rounded hover:opacity-90 transition-opacity">Eliminar</button>
                    <button onClick={() => setDeleteId(null)} className="px-3 py-1 bg-ep-surface border border-ep-border-default text-ep-secondary text-xs rounded hover:text-ep-primary transition-colors">Cancelar</button>
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
      <PushcutSection />
      <UtmifySection />
      <WebhooksSection />
    </div>
  )
}
