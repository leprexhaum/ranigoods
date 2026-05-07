'use client'

import { useState, useEffect } from 'react'
import { Plug, Save, Check, ExternalLink, Bell, BarChart2 } from 'lucide-react'
import clsx from 'clsx'

interface IntegrationSettings {
  pushcutWebhookUrl: string
  utmifyApiToken: string
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

function Input({ value, onChange, placeholder, type = 'text' }: {
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
          <div className="w-9 h-9 rounded-lg bg-ep-accent/10 border border-ep-accent/20 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <h3 className="text-ep-primary font-semibold text-sm">{title}</h3>
            <p className="text-ep-muted text-xs mt-0.5">{description}</p>
          </div>
        </div>
        {docsUrl && (
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-ep-muted hover:text-ep-accent text-xs transition-colors flex-shrink-0 mt-1"
          >
            <ExternalLink size={11} />
            Docs
          </a>
        )}
      </div>
      <div className="px-5 py-5 space-y-4">
        {children}
        <div className="flex justify-end pt-1">
          <button
            onClick={onSave}
            disabled={saving}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold transition-all',
              saved
                ? 'bg-ep-success/20 border border-ep-success/30 text-ep-success'
                : 'bg-ep-accent text-ep-base hover:bg-ep-accent-dark disabled:opacity-60',
            )}
          >
            {saved ? <Check size={12} /> : <Save size={12} />}
            {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function IntegracoesPage() {
  const [settings, setSettings] = useState<IntegrationSettings>({ pushcutWebhookUrl: '', utmifyApiToken: '' })
  const [loading,  setLoading]  = useState(true)
  const [savingPushcut,  setSavingPushcut]  = useState(false)
  const [savedPushcut,   setSavedPushcut]   = useState(false)
  const [savingUtmify,   setSavingUtmify]   = useState(false)
  const [savedUtmify,    setSavedUtmify]    = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setSettings({
          pushcutWebhookUrl: data.pushcutWebhookUrl ?? '',
          utmifyApiToken:    data.utmifyApiToken    ?? '',
        })
        setLoading(false)
      })
      .catch(() => { setError('Erro ao carregar configurações'); setLoading(false) })
  }, [])

  const savePushcut = async () => {
    setSavingPushcut(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushcutWebhookUrl: settings.pushcutWebhookUrl }),
      })
      if (!res.ok) throw new Error()
      setSavedPushcut(true)
      setTimeout(() => setSavedPushcut(false), 2000)
    } catch {
      setError('Erro ao salvar Pushcut')
    } finally {
      setSavingPushcut(false)
    }
  }

  const saveUtmify = async () => {
    setSavingUtmify(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utmifyApiToken: settings.utmifyApiToken }),
      })
      if (!res.ok) throw new Error()
      setSavedUtmify(true)
      setTimeout(() => setSavedUtmify(false), 2000)
    } catch {
      setError('Erro ao salvar UTMify')
    } finally {
      setSavingUtmify(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-6 w-40 bg-ep-raised rounded animate-pulse mb-2" />
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
          Conecte ferramentas externas para notificações e rastreamento de campanhas
        </p>
      </div>

      {error && (
        <div className="bg-ep-danger/10 border border-ep-danger/20 rounded-lg p-3 text-ep-danger text-sm">
          {error}
        </div>
      )}

      <IntegrationCard
        icon={<Bell size={16} className="text-ep-accent" />}
        title="Pushcut"
        description="Receba notificações push no iPhone quando ocorrerem vendas, falhas ou reembolsos"
        docsUrl="https://www.pushcut.io/support.html"
        onSave={savePushcut}
        saving={savingPushcut}
        saved={savedPushcut}
      >
        <Field
          label="Webhook URL"
          hint="Cole a URL do webhook gerada no app Pushcut em Automations → Webhook"
        >
          <Input
            value={settings.pushcutWebhookUrl}
            onChange={v => setSettings(s => ({ ...s, pushcutWebhookUrl: v }))}
            placeholder="https://api.pushcut.io/xxxxxxxx/notifications/..."
          />
        </Field>
        <div className="bg-ep-raised border border-ep-border-subtle rounded-lg p-3 space-y-1.5">
          <p className="text-ep-secondary text-xs font-medium">Eventos enviados</p>
          {[
            { label: 'Venda aprovada',   desc: 'Dispara quando um pagamento é confirmado' },
            { label: 'Pagamento falhou', desc: 'Dispara quando um pagamento é recusado' },
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
        icon={<BarChart2 size={16} className="text-ep-accent" />}
        title="UTMify"
        description="Envie dados de pedidos para o UTMify e rastreie a performance das suas campanhas de tráfego"
        docsUrl="https://utmify.com.br"
        onSave={saveUtmify}
        saving={savingUtmify}
        saved={savedUtmify}
      >
        <Field
          label="API Token"
          hint="Encontre seu token em UTMify → Configurações → API"
        >
          <Input
            value={settings.utmifyApiToken}
            onChange={v => setSettings(s => ({ ...s, utmifyApiToken: v }))}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            type="password"
          />
        </Field>
        <div className="bg-ep-raised border border-ep-border-subtle rounded-lg p-3 space-y-1.5">
          <p className="text-ep-secondary text-xs font-medium">O que é enviado</p>
          {[
            { label: 'Dados do pedido',    desc: 'ID, valor, método de pagamento e status' },
            { label: 'Dados do cliente',   desc: 'Nome, email e telefone' },
            { label: 'Parâmetros UTM',     desc: 'utm_source, utm_medium, utm_campaign, src, sck' },
            { label: 'Comissão',           desc: 'Valor bruto, taxa do gateway e valor líquido' },
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
    </div>
  )
}
