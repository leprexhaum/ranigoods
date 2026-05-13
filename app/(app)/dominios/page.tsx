'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Globe, Plus, Trash2, Copy, Check, RefreshCw,
  CheckCircle2, AlertCircle, Clock, Loader2, Server,
} from 'lucide-react'
import clsx from 'clsx'
import { ListRowSkeleton } from '@/components/ui/Skeleton'

interface CustomDomain {
  id: string
  domain: string
  status: 'pending_ns' | 'propagating' | 'configuring' | 'active' | 'failed'
  failReason: string
  cfNameservers: string[]
  verifiedAt: string | null
  createdAt: string
}

const STATUS_CONFIG = {
  pending_ns: {
    label: 'Aguardando Nameservers',
    color: 'text-ep-warning',
    bg: 'bg-ep-warning/10 border-ep-warning/20',
    icon: Clock,
    step: 1,
  },
  propagating: {
    label: 'Propagando DNS',
    color: 'text-ep-info',
    bg: 'bg-ep-info/10 border-ep-info/20',
    icon: Loader2,
    step: 2,
  },
  configuring: {
    label: 'Configurando',
    color: 'text-ep-info',
    bg: 'bg-ep-info/10 border-ep-info/20',
    icon: Loader2,
    step: 3,
  },
  active: {
    label: 'Ativo',
    color: 'text-ep-success',
    bg: 'bg-ep-success/10 border-ep-success/20',
    icon: CheckCircle2,
    step: 4,
  },
  failed: {
    label: 'Falhou',
    color: 'text-ep-danger',
    bg: 'bg-ep-danger/10 border-ep-danger/20',
    icon: AlertCircle,
    step: 0,
  },
}

const STEPS = [
  { label: 'Nameservers', step: 1 },
  { label: 'Propagação', step: 2 },
  { label: 'Configuração', step: 3 },
  { label: 'Ativo', step: 4 },
]

function StatusBadge({ status }: { status: CustomDomain['status'] }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  const animate = status === 'propagating' || status === 'configuring'
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium', cfg.bg, cfg.color)}>
      <Icon size={11} className={animate ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  )
}

function ProgressStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-1 w-full">
      {STEPS.map((s, i) => {
        const done = currentStep >= s.step
        const active = currentStep === s.step
        return (
          <div key={s.step} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className={clsx(
                'w-full h-1.5 rounded-full transition-all',
                done ? 'bg-ep-accent' : active ? 'bg-ep-accent/40' : 'bg-ep-raised',
              )} />
              <span className={clsx(
                'text-xs whitespace-nowrap',
                done ? 'text-ep-accent font-medium' : 'text-ep-muted',
              )}>
                {s.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NameserversList({ nameservers, domainId }: { nameservers: string[]; domainId: string }) {
  const [copied, setCopied] = useState<number | null>(null)

  const copyNs = (ns: string, idx: number) => {
    navigator.clipboard.writeText(ns)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!nameservers.length) return null

  return (
    <div className="mt-4 p-4 bg-ep-base rounded-lg border border-ep-border-subtle space-y-3">
      <div className="flex items-center gap-2">
        <Server size={13} className="text-ep-accent" />
        <p className="text-ep-primary text-xs font-semibold">Configure estes nameservers no seu registrador</p>
      </div>
      <div className="space-y-2">
        {nameservers.map((ns, i) => (
          <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-ep-raised rounded-md border border-ep-border-default">
            <code className="text-ep-primary text-sm font-mono">{ns}</code>
            <button
              onClick={() => copyNs(ns, i)}
              className="p-1 text-ep-muted hover:text-ep-accent transition-colors"
              title="Copiar"
            >
              {copied === i ? <Check size={13} className="text-ep-success" /> : <Copy size={13} />}
            </button>
          </div>
        ))}
      </div>
      <p className="text-ep-muted text-xs leading-relaxed">
        Substitua os nameservers atuais do seu domínio pelos listados acima.
        A propagação pode levar de alguns minutos até 48 horas.
      </p>
    </div>
  )
}

function DomainCard({ domain, onVerify, onDelete, verifying }: {
  domain: CustomDomain
  onVerify: (id: string) => void
  onDelete: (id: string) => void
  verifying: boolean
}) {
  const [showDelete, setShowDelete] = useState(false)
  const cfg = STATUS_CONFIG[domain.status]

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-xl p-5 space-y-4 transition-all hover:border-ep-border-default/80">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center border',
                domain.status === 'active'
                  ? 'bg-ep-accent/10 border-ep-accent/20'
                  : 'bg-ep-raised border-ep-border-default'
              )}>
                <Globe size={15} className={domain.status === 'active' ? 'text-ep-accent' : 'text-ep-muted'} />
              </div>
              <p className="text-ep-primary text-base font-semibold font-mono">{domain.domain}</p>
            </div>
            <StatusBadge status={domain.status} />
          </div>
          {domain.status === 'active' && domain.verifiedAt && (
            <p className="text-ep-muted text-xs mt-2 ml-10">
              Ativo desde {new Date(domain.verifiedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
          {domain.status === 'failed' && domain.failReason && (
            <p className="text-ep-danger text-xs mt-2 ml-10">{domain.failReason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {domain.status !== 'active' && domain.status !== 'configuring' && (
            <button
              onClick={() => onVerify(domain.id)}
              disabled={verifying}
              className="flex items-center gap-1.5 px-3 py-2 bg-ep-raised border border-ep-border-default text-ep-secondary text-xs font-medium rounded-lg hover:text-ep-primary hover:border-ep-accent disabled:opacity-50 transition-all"
            >
              <RefreshCw size={12} className={verifying ? 'animate-spin' : ''} />
              {verifying ? 'Verificando…' : 'Verificar'}
            </button>
          )}
          <button
            onClick={() => setShowDelete(true)}
            className="p-2 text-ep-muted hover:text-ep-danger rounded-lg hover:bg-ep-danger/5 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress Stepper */}
      {domain.status !== 'active' && domain.status !== 'failed' && (
        <ProgressStepper currentStep={cfg.step} />
      )}

      {/* Nameservers */}
      {domain.status !== 'active' && domain.cfNameservers.length > 0 && (
        <NameserversList nameservers={domain.cfNameservers} domainId={domain.id} />
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className="flex items-center gap-3 p-3 bg-ep-danger/5 border border-ep-danger/20 rounded-lg">
          <p className="text-ep-danger text-xs flex-1">
            Remover <strong>{domain.domain}</strong>? A zona será deletada do Cloudflare.
          </p>
          <button
            onClick={() => { onDelete(domain.id); setShowDelete(false) }}
            className="px-3 py-1.5 bg-ep-danger text-white text-xs font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            Remover
          </button>
          <button
            onClick={() => setShowDelete(false)}
            className="px-3 py-1.5 bg-ep-surface border border-ep-border-default text-ep-secondary text-xs rounded-md hover:text-ep-primary transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

export default function DominiosPage() {
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/domains')
      const data = await res.json()
      setDomains(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const clean = input.trim().toLowerCase()
    if (!clean) { setError('Digite um domínio'); return }
    setAdding(true); setError('')
    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: clean }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao adicionar domínio'); return }
      setInput('')
      await load()
    } finally { setAdding(false) }
  }

  const handleVerify = async (id: string) => {
    setVerifying(id)
    try {
      const res = await fetch(`/api/domains/${id}/verify`, { method: 'POST' })
      const data = await res.json() as CustomDomain
      setDomains(prev => prev.map(d => d.id === id ? data : d))
    } finally { setVerifying(null) }
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/domains/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Domínios Customizados</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            Conecte seu próprio domínio ao checkout — configuração automática via nameservers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {domains.filter(d => d.status === 'active').length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ep-success/10 border border-ep-success/20 text-ep-success text-xs font-medium">
              <CheckCircle2 size={10} />
              {domains.filter(d => d.status === 'active').length} ativo{domains.filter(d => d.status === 'active').length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Add domain */}
      <div className="bg-ep-surface border border-ep-border-default rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-ep-accent" />
          <h2 className="text-ep-primary text-sm font-semibold">Adicionar Domínio</h2>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="meudominio.com"
            className="flex-1 px-4 py-2.5 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-2 px-4 py-2.5 bg-ep-accent text-ep-base text-sm font-semibold rounded-lg hover:bg-ep-accent-dark disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {adding ? 'Criando…' : 'Adicionar'}
          </button>
        </div>
        {error && <p className="text-ep-danger text-xs">{error}</p>}
        <p className="text-ep-muted text-xs">
          Ao adicionar, o sistema criará uma zona DNS automaticamente e fornecerá os nameservers para configurar no seu registrador.
        </p>
      </div>

      {/* Domain list */}
      {loading ? (
        <div className="space-y-4">
          <ListRowSkeleton cols={3} />
          <ListRowSkeleton cols={3} />
        </div>
      ) : domains.length === 0 ? (
        <div className="bg-ep-surface border border-ep-border-default rounded-xl py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-ep-raised border border-ep-border-default flex items-center justify-center mx-auto">
            <Globe size={24} className="text-ep-muted" />
          </div>
          <div>
            <p className="text-ep-primary font-semibold text-sm">Nenhum domínio configurado</p>
            <p className="text-ep-muted text-xs mt-1">Adicione seu primeiro domínio customizado acima</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map(d => (
            <DomainCard
              key={d.id}
              domain={d}
              onVerify={handleVerify}
              onDelete={handleDelete}
              verifying={verifying === d.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
