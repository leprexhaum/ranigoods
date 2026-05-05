'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, Check, X, Copy, Eye, EyeOff, Webhook } from 'lucide-react'
import clsx from 'clsx'

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

export default function WebhooksPage() {
  const [webhooks,    setWebhooks]    = useState<OutboundWebhook[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editId,      setEditId]      = useState<string | null>(null)
  const [form,        setForm]        = useState(emptyForm)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [showSecret,  setShowSecret]  = useState<Record<string, boolean>>({})
  const [copied,      setCopied]      = useState<string | null>(null)
  const [deleteId,    setDeleteId]    = useState<string | null>(null)

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

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  const openEdit = (wh: OutboundWebhook) => {
    setEditId(wh.id)
    setForm({ name: wh.name, url: wh.url, events: wh.events, productIds: wh.productIds, enabled: wh.enabled })
    setError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) { setError('Nome e URL são obrigatórios'); return }
    setSaving(true)
    setError('')
    try {
      const res = editId
        ? await fetch(`/api/webhooks/${editId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        : await fetch('/api/webhooks',            { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Erro ao guardar'); return }
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (wh: OutboundWebhook) => {
    await fetch(`/api/webhooks/${wh.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !wh.enabled }),
    })
    await load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    setDeleteId(null)
    await load()
  }

  const copySecret = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const toggleEvent = (ev: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }))
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Webhooks</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">Receba notificações HTTP quando ocorrem eventos de pagamento</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-3 py-2 bg-ep-accent text-ep-base text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
        >
          <Plus size={14} />
          Novo webhook
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-ep-surface border border-ep-border-default rounded-lg p-5 space-y-4">
          <h2 className="text-ep-primary font-semibold text-sm">{editId ? 'Editar webhook' : 'Novo webhook'}</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-ep-secondary text-xs mb-1">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Meu servidor"
                className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-ep-secondary text-xs mb-1">URL do endpoint</label>
              <input
                type="url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://meusite.com/webhook"
                className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-ep-secondary text-xs mb-2">Eventos</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map(ev => (
                <button
                  key={ev.value}
                  type="button"
                  onClick={() => toggleEvent(ev.value)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-xs font-medium border transition-all',
                    form.events.includes(ev.value)
                      ? 'bg-ep-accent text-ep-base border-ep-accent'
                      : 'bg-ep-raised text-ep-secondary border-ep-border-default hover:border-ep-accent',
                  )}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-ep-accent text-ep-base text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Check size={14} />
              {saving ? 'A guardar…' : 'Guardar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 px-4 py-2 bg-ep-raised border border-ep-border-default text-ep-secondary text-sm rounded-md hover:text-ep-primary transition-colors"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-ep-muted text-sm py-8 text-center">Carregando…</div>
      ) : webhooks.length === 0 ? (
        <div className="bg-ep-surface border border-ep-border-default rounded-lg py-12 flex flex-col items-center gap-3">
          <Webhook size={28} className="text-ep-muted" />
          <p className="text-ep-secondary text-sm">Nenhum webhook configurado</p>
          <button onClick={openCreate} className="text-ep-accent text-sm hover:underline">Criar o primeiro</button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh.id} className="bg-ep-surface border border-ep-border-default rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-ep-primary text-sm font-semibold">{wh.name}</span>
                    <span className={clsx(
                      'inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium border',
                      wh.enabled
                        ? 'text-ep-success bg-ep-success/10 border-ep-success/20'
                        : 'text-ep-muted bg-ep-raised border-ep-border-default',
                    )}>
                      {wh.enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-ep-muted text-xs font-mono truncate">{wh.url}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {wh.events.map(ev => (
                      <span key={ev} className="px-1.5 py-0.5 bg-ep-raised border border-ep-border-subtle rounded text-xs text-ep-secondary">
                        {ev}
                      </span>
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
                    className="p-1.5 rounded text-ep-muted hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Secret */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-ep-muted text-xs">Secret:</span>
                <code className="text-xs font-mono text-ep-secondary bg-ep-raised px-2 py-0.5 rounded border border-ep-border-subtle flex-1 truncate">
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

              {/* Confirmação de delete */}
              {deleteId === wh.id && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-xs flex-1">Eliminar este webhook? Esta ação não pode ser desfeita.</p>
                  <button onClick={() => handleDelete(wh.id)}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors">
                    Eliminar
                  </button>
                  <button onClick={() => setDeleteId(null)}
                    className="px-3 py-1 bg-white border border-red-200 text-red-600 text-xs rounded hover:bg-red-50 transition-colors">
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
