'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, Save, Copy, Check } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'geral' | 'stripe' | 'notificacoes' | 'seguranca'

const tabs: { id: Tab; label: string }[] = [
  { id: 'geral',         label: 'Geral'          },
  { id: 'stripe',        label: 'Stripe'         },
  { id: 'notificacoes',  label: 'Notificações'   },
  { id: 'seguranca',     label: 'Segurança'      },
]

function SecretInput({ value, placeholder, label }: { value: string; placeholder: string; label: string }) {
  const [show,   setShow]   = useState(false)
  const [copied, setCopied] = useState(false)
  const [val,    setVal]    = useState(value)
  const copy = () => { navigator.clipboard.writeText(val); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div>
      <label className="text-ep-secondary text-xs font-medium block mb-1.5">{label}</label>
      <div className="relative flex items-center">
        <input type={show ? 'text' : 'password'} value={val} onChange={(e) => setVal(e.target.value)}
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

function SaveButton({ label = 'Salvar alterações' }: { label?: string }) {
  const [saved, setSaved] = useState(false)
  return (
    <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all',
        saved
          ? 'bg-ep-success/20 border border-ep-success/30 text-ep-success'
          : 'bg-ep-accent text-ep-base hover:bg-ep-accent-dark'
      )}>
      {saved ? <Check size={14} /> : <Save size={14} />}
      {saved ? 'Salvo!' : label}
    </button>
  )
}

export default function ConfiguracoesPage() {
  const [tab] = useState<Tab>('geral')
  const [activeTab, setActiveTab] = useState<Tab>('geral')
  const [webhookUrl] = useState('https://ranigoods.pt/api/stripe/webhook')

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-ep-primary text-lg md:text-xl font-bold">Configurações</h1>
        <p className="text-ep-secondary text-xs md:text-sm mt-0.5">Gerencie sua conta e integrações</p>
      </div>

      {/* Tabs — scroll horizontal no mobile */}
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
        {/* Geral */}
        {activeTab === 'geral' && (
          <div className="bg-ep-surface border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
            <div className="p-4 md:p-5 space-y-4">
              <h3 className="text-ep-primary font-semibold text-sm">Informações da Empresa</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Nome da empresa', defaultValue: 'RaniGoods', placeholder: '' },
                  { label: 'NIF', defaultValue: '', placeholder: 'Ex: 509 123 456' },
                  { label: 'E-mail comercial', defaultValue: 'geral@ranigoods.pt', placeholder: '' },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-ep-secondary text-xs font-medium block mb-1.5">{f.label}</label>
                    <input defaultValue={f.defaultValue} placeholder={f.placeholder}
                      className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm focus:outline-none focus:border-ep-accent placeholder-ep-muted" />
                  </div>
                ))}
                <div>
                  <label className="text-ep-secondary text-xs font-medium block mb-1.5">Fuso horário</label>
                  <select className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm focus:outline-none focus:border-ep-accent appearance-none">
                    <option>Europe/Lisbon</option>
                    <option>Europe/Madrid</option>
                    <option>Atlantic/Azores</option>
                    <option>America/Sao_Paulo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-5 flex justify-end"><SaveButton /></div>
          </div>
        )}

        {/* Stripe */}
        {activeTab === 'stripe' && (
          <div className="space-y-4">
            {/* Card decorativo */}
            <div className="relative overflow-hidden bg-ep-surface border border-ep-border-default rounded-lg p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-ep-primary font-semibold text-sm">Integração Stripe</p>
                <p className="text-ep-secondary text-xs mt-1 max-w-xs">
                  Configure suas chaves de API para processar pagamentos com segurança via Stripe.
                </p>
              </div>
              <Image
                src="/cartaodigitalfuturista.png"
                alt="RaniGoods Pay"
                width={140}
                height={95}
                className="flex-shrink-0 rounded-lg object-cover opacity-90"
              />
            </div>

            <div className="bg-ep-surface border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
              <div className="p-4 md:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-ep-primary font-semibold text-sm">Chaves de API</h3>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium bg-ep-warning/10 border border-ep-warning/20 text-ep-warning">
                    Ambiente de Teste
                  </span>
                </div>
                <SecretInput label="Chave pública (Publishable Key)" value="pk_test_..." placeholder="pk_test_..." />
                <SecretInput label="Chave secreta (Secret Key)"     value="sk_test_..." placeholder="sk_test_..." />
              </div>
              <div className="p-4 md:p-5 flex justify-end"><SaveButton label="Salvar chaves" /></div>
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
                <SecretInput label="Webhook Secret" value="whsec_..." placeholder="whsec_..." />
              </div>
              <div className="p-4 md:p-5 flex justify-end"><SaveButton label="Salvar webhook" /></div>
            </div>
          </div>
        )}

        {/* Notificações */}
        {activeTab === 'notificacoes' && (
          <div className="bg-ep-surface border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
            <div className="p-4 md:p-5 space-y-4">
              <h3 className="text-ep-primary font-semibold text-sm">Notificações por E-mail</h3>
              {[
                { label: 'Pagamento aprovado',   desc: 'Receba um e-mail a cada venda aprovada' },
                { label: 'Pagamento falhou',      desc: 'Alerta quando uma transação falhar'     },
                { label: 'Reembolso processado',  desc: 'Notificação de reembolsos'              },
                { label: 'Resumo diário',         desc: 'Relatório diário com métricas do dia'   },
                { label: 'Resumo semanal',        desc: 'Relatório semanal com visão geral'      },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-ep-primary text-sm">{item.label}</p>
                    <p className="text-ep-muted text-xs">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-ep-overlay rounded-full peer peer-checked:bg-ep-accent transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-ep-base rounded-full transition-all peer-checked:translate-x-4" />
                  </label>
                </div>
              ))}
            </div>
            <div className="p-4 md:p-5 flex justify-end"><SaveButton /></div>
          </div>
        )}

        {/* Segurança */}
        {activeTab === 'seguranca' && (
          <div className="space-y-4">
            <div className="bg-ep-surface border border-ep-border-default rounded-lg divide-y divide-ep-border-subtle">
              <div className="p-4 md:p-5 space-y-4">
                <h3 className="text-ep-primary font-semibold text-sm">Alterar Senha</h3>
                {['Senha atual', 'Nova senha', 'Confirmar nova senha'].map((l) => (
                  <div key={l}>
                    <label className="text-ep-secondary text-xs font-medium block mb-1.5">{l}</label>
                    <input type="password" placeholder="••••••••"
                      className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent" />
                  </div>
                ))}
              </div>
              <div className="p-4 md:p-5 flex justify-end"><SaveButton label="Atualizar senha" /></div>
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
