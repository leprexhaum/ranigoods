'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, Save, Copy, Check, Loader2 } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'geral' | 'stripe' | 'notificacoes' | 'seguranca'

const tabs: { id: Tab; label: string }[] = [
  { id: 'geral',        label: 'Geral'        },
  { id: 'stripe',       label: 'Stripe'       },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'seguranca',    label: 'Segurança'    },
]

function SecretInput({
  value, onChange, placeholder, label,
}: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div>
      <label className="text-ep-secondary text-xs font-medium block mb-1.5">{label}</label>
      <div className="relative flex items-center">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-3 pr-16 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
        />
        <div className="absolute right-2 flex items-center gap-1">
          <button onClick={copy} className="p-1 text-ep-muted hover:text-ep-accent transition-colors">
            {copied ? <Check size={13} className="text-ep-success" /> : <Copy size={13} />}
          </button>
          <button onClick={() => setShow(!show)} className="p-1 text-ep-muted hover:text-ep-accent transition-colors">
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  const [saved, setSaved] = useState(false)

  const handle = async () => {
    await onClick()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all',
        saved
          ? 'bg-ep-success/20 border border-ep-success/30 text-ep-success'
          : 'bg-ep-accent text-ep-base hover:bg-ep-accent-dark disabled:opacity-60'
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
      {saved ? 'Salvo!' : 'Salvar alterações'}
    </button>
  )
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('geral')
  const [saving,    setSaving]    = useState(false)
  const [loadError, setLoadError] = useState('')
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/stripe/webhook`
    : '/api/stripe/webhook'

  // Geral
  const [companyName, setCompanyName] = useState('')
  const [nif,         setNif]         = useState('')
  const [email,       setEmail]       = useState('')
  const [timezone,    setTimezone]    = useState('Europe/Lisbon')

  // Stripe
  const [stripeKey,      setStripeKey]      = useState('')
  const [stripeSecret,   setStripeSecret]   = useState('')
  const [webhookSecret,  setWebhookSecret]  = useState('')

  // Notificações
  const [notifyApproved, setNotifyApproved] = useState(true)
  const [notifyFailed,   setNotifyFailed]   = useState(true)
  const [notifyRefund,   setNotifyRefund]   = useState(false)
  const [notifyDaily,    setNotifyDaily]    = useState(false)
  const [notifyWeekly,   setNotifyWeekly]   = useState(false)

  // Segurança
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [passwordError,    setPasswordError]    = useState('')
  const [passwordOk,       setPasswordOk]       = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        setCompanyName(d.companyName ?? '')
        setNif(d.nif ?? '')
        setEmail(d.email ?? '')
        setTimezone(d.timezone ?? 'Europe/Lisbon')
        setStripeKey(d.stripeKey ?? '')
        setStripeSecret(d.stripeSecret ?? '')
        setWebhookSecret(d.webhookSecret ?? '')
        setNotifyApproved(d.notifyApproved ?? true)
        setNotifyFailed(d.notifyFailed ?? true)
        setNotifyRefund(d.notifyRefund ?? false)
        setNotifyDaily(d.notifyDaily ?? false)
        setNotifyWeekly(d.notifyWeekly ?? false)
      })
      .catch(() => setLoadError('Erro ao carregar configurações'))
  }, [])

  const saveGeral = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, nif, email, timezone }),
    })
    setSaving(false)
  }

  const saveStripe = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripeKey, stripeSecret, webhookSecret }),
    })
    setSaving(false)
  }

  const saveNotificacoes = async () => {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifyApproved, notifyFailed, notifyRefund, notifyDaily, notifyWeekly }),
    })
    setSaving(false)
  }

  const savePassword = async () => {
    setPasswordError('')
    setPasswordOk(false)
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem')
      return
    }
    setSaving(true)
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setPasswordError(d.error ?? 'Erro ao alterar senha')
    } else {
      setPasswordOk(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const notifItems = [
    { label: 'Pagamento aprovado',  desc: 'Receba um e-mail a cada venda aprovada', value: notifyApproved, set: setNotifyApproved },
    { label: 'Pagamento falhou',    desc: 'Alerta quando uma transação falhar',     value: notifyFailed,   set: setNotifyFailed   },
    { label: 'Reembolso processado',desc: 'Notificação de reembolsos',              value: notifyRefund,   set: setNotifyRefund   },
    { label: 'Resumo diário',       desc: 'Relatório diário com métricas do dia',   value: notifyDaily,    set: setNotifyDaily    },
    { label: 'Resumo semanal',      desc: 'Relatório semanal com visão geral',      value: notifyWeekly,   set: setNotifyWeekly   },
  ]

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-ep-primary text-lg md:text-xl font-bold">Configurações</h1>
        <p className="text-ep-secondary text-xs md:text-sm mt-0.5">Gerencie sua conta e integrações</p>
      </div>

      {loadError && (
        <div className="bg-ep-danger/10 border border-ep-danger/20 rounded-lg p-3 text-ep-danger text-sm">
          {loadError}
        </div>
      )}

      <div className="overflow-x-auto pb-px">
        <div className="flex items-center gap-1 bg-ep-surface border border-ep-border-default rounded-md p-1 w-fit min-w-full sm:min-w-0">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={clsx(
                'px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-1 sm:flex-none',
                activeTab === t.id
                  ? 'bg-ep-accent text-ep-base font-semibold'
                  : 'text-ep-secondary hover:text-ep-primary'
              )}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        {activeTab === 'geral' && (
          <div className="bg-ep-surface border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
            <div className="p-4 md:p-5 space-y-4">
              <h3 className="text-ep-primary font-semibold text-sm">Informações da Empresa</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-ep-secondary text-xs font-medium block mb-1.5">Nome da empresa</label>
                  <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm focus:outline-none focus:border-ep-accent" />
                </div>
                <div>
                  <label className="text-ep-secondary text-xs font-medium block mb-1.5">NIF</label>
                  <input value={nif} onChange={e => setNif(e.target.value)} placeholder="Ex: 509 123 456"
                    className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm focus:outline-none focus:border-ep-accent placeholder-ep-muted" />
                </div>
                <div>
                  <label className="text-ep-secondary text-xs font-medium block mb-1.5">E-mail comercial</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                    className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm focus:outline-none focus:border-ep-accent" />
                </div>
                <div>
                  <label className="text-ep-secondary text-xs font-medium block mb-1.5">Fuso horário</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm focus:outline-none focus:border-ep-accent appearance-none">
                    <option>Europe/Lisbon</option>
                    <option>Europe/Madrid</option>
                    <option>Atlantic/Azores</option>
                    <option>America/Sao_Paulo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-5 flex justify-end">
              <SaveButton onClick={saveGeral} loading={saving} />
            </div>
          </div>
        )}

        {activeTab === 'stripe' && (
          <div className="space-y-4">
            <div className="relative overflow-hidden bg-ep-surface border border-ep-border-default rounded-lg p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-ep-primary font-semibold text-sm">Integração Stripe</p>
                <p className="text-ep-secondary text-xs mt-1 max-w-xs">
                  Configure suas chaves de API para processar pagamentos com segurança via Stripe.
                </p>
              </div>
              <Image src="/cartaodigitalfuturista.png" alt="RaniGoods Pay" width={140} height={95}
                className="flex-shrink-0 rounded-lg object-cover opacity-90" />
            </div>

            <div className="bg-ep-surface border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
              <div className="p-4 md:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-ep-primary font-semibold text-sm">Chaves de API</h3>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-ep-warning/10 border border-ep-warning/20 text-ep-warning">
                    Ambiente de Teste
                  </span>
                </div>
                <SecretInput label="Chave pública (Publishable Key)" value={stripeKey} onChange={setStripeKey} placeholder="pk_test_..." />
                <SecretInput label="Chave secreta (Secret Key)" value={stripeSecret} onChange={setStripeSecret} placeholder="sk_test_..." />
              </div>
              <div className="p-4 md:p-5 flex justify-end">
                <SaveButton onClick={saveStripe} loading={saving} />
              </div>
            </div>

            <div className="bg-ep-surface border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
              <div className="p-4 md:p-5 space-y-4">
                <h3 className="text-ep-primary font-semibold text-sm">Webhook</h3>
                <div>
                  <label className="text-ep-secondary text-xs font-medium block mb-1.5">URL do Webhook</label>
                  <div className="flex items-center gap-2">
                    <input readOnly value={webhookUrl}
                      className="flex-1 min-w-0 px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary text-xs sm:text-sm font-mono truncate" />
                    <button onClick={() => navigator.clipboard.writeText(webhookUrl)}
                      className="flex-shrink-0 px-2.5 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-secondary hover:text-ep-accent hover:border-ep-accent transition-colors">
                      <Copy size={13} />
                    </button>
                  </div>
                  <p className="text-ep-muted text-xs mt-1.5">Registre no Stripe → Developers → Webhooks</p>
                </div>
                <SecretInput label="Webhook Secret" value={webhookSecret} onChange={setWebhookSecret} placeholder="whsec_..." />
              </div>
              <div className="p-4 md:p-5 flex justify-end">
                <SaveButton onClick={saveStripe} loading={saving} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notificacoes' && (
          <div className="bg-ep-surface border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
            <div className="p-4 md:p-5 space-y-4">
              <h3 className="text-ep-primary font-semibold text-sm">Notificações por E-mail</h3>
              {notifItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-ep-primary text-sm">{item.label}</p>
                    <p className="text-ep-muted text-xs">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={item.value} onChange={e => item.set(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-ep-overlay rounded-full peer peer-checked:bg-ep-accent transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-ep-base rounded-full transition-all peer-checked:translate-x-4" />
                  </label>
                </div>
              ))}
            </div>
            <div className="p-4 md:p-5 flex justify-end">
              <SaveButton onClick={saveNotificacoes} loading={saving} />
            </div>
          </div>
        )}

        {activeTab === 'seguranca' && (
          <div className="space-y-4">
            <div className="bg-ep-surface border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
              <div className="p-4 md:p-5 space-y-4">
                <h3 className="text-ep-primary font-semibold text-sm">Alterar Senha</h3>
                {passwordError && (
                  <p className="text-ep-danger text-xs">{passwordError}</p>
                )}
                {passwordOk && (
                  <p className="text-ep-success text-xs">Senha alterada com sucesso!</p>
                )}
                <div>
                  <label className="text-ep-secondary text-xs font-medium block mb-1.5">Senha atual</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••"
                    className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
                </div>
                <div>
                  <label className="text-ep-secondary text-xs font-medium block mb-1.5">Nova senha</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••"
                    className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
                </div>
                <div>
                  <label className="text-ep-secondary text-xs font-medium block mb-1.5">Confirmar nova senha</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••"
                    className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
                </div>
              </div>
              <div className="p-4 md:p-5 flex justify-end">
                <SaveButton onClick={savePassword} loading={saving} />
              </div>
            </div>

            <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-ep-primary font-semibold text-sm">Autenticação em 2 Fatores</h3>
                  <p className="text-ep-secondary text-xs mt-1">Adicione uma camada extra de segurança à sua conta</p>
                </div>
                <button className="px-4 py-2 bg-ep-accent text-ep-base rounded-md text-xs font-semibold hover:bg-ep-accent-dark transition-colors flex-shrink-0">
                  Ativar 2FA
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
