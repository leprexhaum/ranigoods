'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Send, Globe, Zap, Play, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import clsx from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string
  type: string
  success: boolean
  duration: number
  timestamp: string
  details?: Record<string, unknown>
  error?: string
}

interface ProductOption {
  id: string
  name: string
  price: number
  currency: string
}

interface UtmifyConfigOption {
  id: string
  name: string
  enabled: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PUSHCUT_EVENTS = [
  { id: 'payment.succeeded', label: 'Pagamento Aprovado' },
  { id: 'payment.failed', label: 'Pagamento Falhado' },
  { id: 'payment.refunded', label: 'Reembolso' },
]

const WEBHOOK_EVENTS = [
  { id: 'payment.succeeded', label: 'payment.succeeded' },
  { id: 'payment.failed', label: 'payment.failed' },
  { id: 'payment.refunded', label: 'payment.refunded' },
]

const STRIPE_EVENTS = [
  { id: 'payment_intent.succeeded', label: 'payment_intent.succeeded' },
  { id: 'payment_intent.payment_failed', label: 'payment_intent.payment_failed' },
  { id: 'charge.succeeded', label: 'charge.succeeded' },
  { id: 'charge.refunded', label: 'charge.refunded' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-lg text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors'
const SELECT_CLS = INPUT_CLS + ' appearance-none'

function formatDuration(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

// ─── TestPanel ────────────────────────────────────────────────────────────────

function TestPanel({ title, icon, children, onRun, running }: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  onRun: () => void
  running: boolean
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-ep-raised/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ep-accent/10 border border-ep-accent/20 flex items-center justify-center text-ep-accent">
            {icon}
          </div>
          <h3 className="text-ep-primary font-semibold text-sm">{title}</h3>
        </div>
        {expanded ? <ChevronUp size={14} className="text-ep-muted" /> : <ChevronDown size={14} className="text-ep-muted" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-ep-border-subtle pt-4">
          {children}
          <button
            type="button"
            onClick={onRun}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2.5 bg-ep-accent text-ep-base rounded-lg text-sm font-semibold hover:bg-ep-accent-dark transition-colors disabled:opacity-60"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? 'A executar…' : 'Executar Teste'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── LogViewer ────────────────────────────────────────────────────────────────

function LogViewer({ logs, onClear }: { logs: LogEntry[]; onClear: () => void }) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  if (logs.length === 0) {
    return (
      <div className="bg-ep-surface border border-ep-border-default rounded-xl p-6 text-center">
        <p className="text-ep-muted text-sm">Nenhum teste executado ainda. Execute um teste acima para ver os resultados aqui.</p>
      </div>
    )
  }

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-ep-border-subtle">
        <h3 className="text-ep-primary font-semibold text-sm">Logs ({logs.length})</h3>
        <button onClick={onClear} className="flex items-center gap-1 text-ep-muted hover:text-ep-danger text-xs transition-colors">
          <Trash2 size={11} /> Limpar
        </button>
      </div>
      <div className="max-h-[500px] overflow-y-auto divide-y divide-ep-border-subtle">
        {logs.map(log => (
          <LogEntryRow key={log.id} log={log} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}

function LogEntryRow({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="px-5 py-3">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 text-left"
      >
        {log.success
          ? <CheckCircle2 size={14} className="text-ep-success flex-shrink-0" />
          : <XCircle size={14} className="text-ep-danger flex-shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-ep-primary text-xs font-medium">{log.type}</span>
            <span className={clsx('text-xs px-1.5 py-0.5 rounded', log.success ? 'bg-ep-success/10 text-ep-success' : 'bg-ep-danger/10 text-ep-danger')}>
              {log.success ? 'OK' : 'ERRO'}
            </span>
            <span className="text-ep-muted text-xs">{formatDuration(log.duration)}</span>
          </div>
          {log.error && <p className="text-ep-danger text-xs mt-0.5 truncate">{log.error}</p>}
        </div>
        <span className="text-ep-muted text-xs flex-shrink-0">{log.timestamp}</span>
        {log.details && (expanded ? <ChevronUp size={12} className="text-ep-muted" /> : <ChevronDown size={12} className="text-ep-muted" />)}
      </button>

      {expanded && log.details && (
        <pre className="mt-2 p-3 bg-ep-base rounded-lg text-xs text-ep-secondary overflow-x-auto max-h-[300px] overflow-y-auto border border-ep-border-subtle">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevIntegracoesPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [utmifyConfigs, setUtmifyConfigs] = useState<UtmifyConfigOption[]>([])
  const [running, setRunning] = useState<string | null>(null)

  // Pushcut state
  const [pushEvent, setPushEvent] = useState('payment.succeeded')
  const [pushTitle, setPushTitle] = useState('🧪 Teste Pushcut')
  const [pushMessage, setPushMessage] = useState('Notificação de teste — TechPags Dev')

  // UTMify state
  const [utmConfigId, setUtmConfigId] = useState('')
  const [utmProduct, setUtmProduct] = useState('')
  const [utmAmount, setUtmAmount] = useState('1000')

  // Outbound Webhook state
  const [whEvent, setWhEvent] = useState('payment.succeeded')
  const [whProduct, setWhProduct] = useState('')
  const [whAmount, setWhAmount] = useState('1000')

  // Stripe Webhook state
  const [stripeEvent, setStripeEvent] = useState('payment_intent.succeeded')
  const [stripeProduct, setStripeProduct] = useState('')
  const [stripeAmount, setStripeAmount] = useState('1000')

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then((data: ProductOption[]) => setProducts(data)).catch(() => {})
    fetch('/api/integrations/utmify').then(r => r.json()).then((data: UtmifyConfigOption[]) => setUtmifyConfigs(data)).catch(() => {})
  }, [])

  const addLog = (type: string, result: { success: boolean; duration: number; details?: Record<string, unknown>; error?: string }) => {
    setLogs(prev => [...prev, {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      success: result.success,
      duration: result.duration,
      timestamp: new Date().toLocaleTimeString('pt-PT'),
      details: result.details as Record<string, unknown> | undefined,
      error: result.error,
    }])
  }

  const runTest = async (type: string, payload: Record<string, unknown>) => {
    setRunning(type)
    try {
      const res = await fetch('/api/dev/test-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload }),
      })
      const data = await res.json()
      addLog(type, data)
    } catch (err) {
      addLog(type, { success: false, duration: 0, error: err instanceof Error ? err.message : 'Erro de rede' })
    } finally {
      setRunning(null)
    }
  }

  const selectedProduct = (id: string) => products.find(p => p.id === id)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-ep-primary text-lg font-bold">Dev — Teste de Integrações</h1>
        <p className="text-ep-secondary text-xs mt-0.5">Página oculta para testar Pushcut, UTMify, Webhooks e Stripe Webhook</p>
      </div>

      <div className="space-y-4">
        {/* Pushcut */}
        <TestPanel
          title="Pushcut"
          icon={<Bell size={16} />}
          running={running === 'pushcut'}
          onRun={() => runTest('pushcut', { event: pushEvent, title: pushTitle, message: pushMessage })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-ep-secondary text-xs font-medium block mb-1">Evento</label>
              <select value={pushEvent} onChange={e => setPushEvent(e.target.value)} className={SELECT_CLS}>
                {PUSHCUT_EVENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-ep-secondary text-xs font-medium block mb-1">Título</label>
              <input value={pushTitle} onChange={e => setPushTitle(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
          <div>
            <label className="text-ep-secondary text-xs font-medium block mb-1">Mensagem</label>
            <input value={pushMessage} onChange={e => setPushMessage(e.target.value)} className={INPUT_CLS} />
          </div>
        </TestPanel>

        {/* UTMify */}
        <TestPanel
          title="UTMify"
          icon={<Send size={16} />}
          running={running === 'utmify'}
          onRun={() => {
            const prod = selectedProduct(utmProduct)
            runTest('utmify', {
              configId: utmConfigId,
              productId: prod?.id || 'prod_test',
              productName: prod?.name || 'Produto Teste',
              amount: utmAmount,
              currency: prod?.currency?.toLowerCase() || 'eur',
            })
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-ep-secondary text-xs font-medium block mb-1">Config UTMify *</label>
              <select value={utmConfigId} onChange={e => setUtmConfigId(e.target.value)} className={SELECT_CLS}>
                <option value="">Selecionar config…</option>
                {utmifyConfigs.map(c => <option key={c.id} value={c.id}>{c.name || 'Sem nome'}{!c.enabled ? ' (desativado)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-ep-secondary text-xs font-medium block mb-1">Produto (opcional)</label>
              <select value={utmProduct} onChange={e => setUtmProduct(e.target.value)} className={SELECT_CLS}>
                <option value="">Dados fictícios</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} — {(p.price / 100).toFixed(2)} {p.currency}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-ep-secondary text-xs font-medium block mb-1">Valor (centavos)</label>
            <input type="number" value={utmAmount} onChange={e => setUtmAmount(e.target.value)} placeholder="1000" className={INPUT_CLS + ' max-w-[200px]'} />
          </div>
        </TestPanel>

        {/* Outbound Webhooks */}
        <TestPanel
          title="Outbound Webhooks"
          icon={<Globe size={16} />}
          running={running === 'outbound_webhook'}
          onRun={() => {
            const prod = selectedProduct(whProduct)
            runTest('outbound_webhook', {
              event: whEvent,
              productId: prod?.id || 'prod_test',
              productName: prod?.name || 'Produto Teste',
              amount: whAmount,
              currency: prod?.currency || 'EUR',
            })
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-ep-secondary text-xs font-medium block mb-1">Evento</label>
              <select value={whEvent} onChange={e => setWhEvent(e.target.value)} className={SELECT_CLS}>
                {WEBHOOK_EVENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-ep-secondary text-xs font-medium block mb-1">Produto (opcional)</label>
              <select value={whProduct} onChange={e => setWhProduct(e.target.value)} className={SELECT_CLS}>
                <option value="">Dados fictícios</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-ep-secondary text-xs font-medium block mb-1">Valor (centavos)</label>
            <input type="number" value={whAmount} onChange={e => setWhAmount(e.target.value)} placeholder="1000" className={INPUT_CLS + ' max-w-[200px]'} />
          </div>
        </TestPanel>

        {/* Stripe Webhook Simulado */}
        <TestPanel
          title="Stripe Webhook Simulado"
          icon={<Zap size={16} />}
          running={running === 'stripe_webhook'}
          onRun={() => {
            const prod = selectedProduct(stripeProduct)
            runTest('stripe_webhook', {
              event: stripeEvent,
              productId: prod?.id || 'prod_test',
              productName: prod?.name || 'Produto Teste',
              amount: stripeAmount,
              currency: prod?.currency?.toLowerCase() || 'eur',
            })
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-ep-secondary text-xs font-medium block mb-1">Evento Stripe</label>
              <select value={stripeEvent} onChange={e => setStripeEvent(e.target.value)} className={SELECT_CLS}>
                {STRIPE_EVENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-ep-secondary text-xs font-medium block mb-1">Produto (opcional)</label>
              <select value={stripeProduct} onChange={e => setStripeProduct(e.target.value)} className={SELECT_CLS}>
                <option value="">Dados fictícios</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-ep-secondary text-xs font-medium block mb-1">Valor (centavos)</label>
            <input type="number" value={stripeAmount} onChange={e => setStripeAmount(e.target.value)} placeholder="1000" className={INPUT_CLS + ' max-w-[200px]'} />
          </div>
        </TestPanel>
      </div>

      {/* Logs */}
      <LogViewer logs={logs} onClear={() => setLogs([])} />
    </div>
  )
}
