'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, ShieldAlert, X, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { ListRowSkeleton } from '@/components/ui/Skeleton'

interface ApiKeyRecord {
  id:        string
  name:      string
  keyPrefix: string
  key?:      string   // só presente no momento da criação
  createdAt: string
  revokedAt: string | null
}

// ─── KeyDisplay ──────────────────────────────────────────────────────────────
// Mostra a chave com blur animado e botão de revelar/ocultar + copiar

function KeyDisplay({
  value,
  fullKey,
  isNew = false,
  revoked = false,
}: {
  value:    string   // keyPrefix (lista) ou chave completa (banner)
  fullKey?: string   // chave completa — só disponível no momento da criação
  isNew?:   boolean
  revoked?: boolean
}) {
  const [revealed,  setRevealed]  = useState(isNew)   // nova key começa revelada
  const [copied,    setCopied]    = useState(false)
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const displayValue = fullKey ?? value

  function toggle() {
    if (animating) return
    setAnimating(true)
    timerRef.current = setTimeout(() => {
      setRevealed(r => !r)
      setAnimating(false)
    }, 180)
  }

  function copy() {
    navigator.clipboard.writeText(displayValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const maskedValue = fullKey
    ? fullKey.slice(0, 10) + '•'.repeat(Math.max(0, fullKey.length - 10))
    : value.slice(0, 10) + '••••••••••••••••••••'

  return (
    <div className={clsx(
      'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
      isNew
        ? 'bg-ep-success/5 border-ep-success/20'
        : revoked
        ? 'bg-ep-overlay/30 border-ep-border-subtle'
        : 'bg-ep-raised border-ep-border-default',
    )}>
      {/* Chave */}
      <code
        className={clsx(
          'flex-1 text-xs font-mono min-w-0 truncate select-all transition-all duration-300',
          revoked ? 'text-ep-muted line-through' : isNew ? 'text-ep-success' : 'text-ep-primary',
          animating && 'opacity-0 scale-y-95',
          !animating && revealed && 'blur-none',
          !animating && !revealed && 'blur-[4px] select-none',
        )}
        style={{ transition: 'filter 0.25s ease, opacity 0.18s ease, transform 0.18s ease' }}
      >
        {revealed ? displayValue : maskedValue}
      </code>

      {/* Botão revelar/ocultar */}
      {!revoked && (
        <button
          onClick={toggle}
          disabled={animating}
          title={revealed ? 'Ocultar' : 'Revelar'}
          className={clsx(
            'flex-shrink-0 p-1 rounded transition-colors',
            'text-ep-muted hover:text-ep-primary disabled:opacity-40',
          )}
        >
          {revealed
            ? <EyeOff size={13} />
            : <Eye    size={13} />}
        </button>
      )}

      {/* Botão copiar */}
      {!revoked && (
        <button
          onClick={copy}
          title="Copiar"
          className={clsx(
            'flex-shrink-0 p-1 rounded transition-colors',
            copied
              ? 'text-ep-success'
              : 'text-ep-muted hover:text-ep-primary',
          )}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      )}
    </div>
  )
}

// ─── NewKeyBanner ─────────────────────────────────────────────────────────────

function NewKeyBanner({ apiKey, onClose }: { apiKey: ApiKeyRecord; onClose: () => void }) {
  return (
    <div className="bg-ep-success/8 border border-ep-success/25 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ep-success/15 border border-ep-success/25 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Key size={14} className="text-ep-success" />
          </div>
          <div>
            <p className="text-ep-success text-sm font-semibold">Key criada com sucesso</p>
            <p className="text-ep-secondary text-xs mt-0.5">
              Copie agora — por segurança, a chave completa não será exibida novamente
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-ep-muted hover:text-ep-primary transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      <KeyDisplay value={apiKey.keyPrefix} fullKey={apiKey.key} isNew />

      <div className="flex items-center gap-1.5 text-ep-warning text-xs">
        <ShieldAlert size={11} className="flex-shrink-0" />
        Guarde esta chave num local seguro. Ela não pode ser recuperada depois de fechar este aviso.
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const [keys,      setKeys]      = useState<ApiKeyRecord[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newName,   setNewName]   = useState('')
  const [creating,  setCreating]  = useState(false)
  const [newKey,    setNewKey]    = useState<ApiKeyRecord | null>(null)
  const [revoking,  setRevoking]  = useState<string | null>(null)
  const { confirmProps, confirm } = useConfirm()

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/api-keys')
      const data = await res.json() as ApiKeyRecord[]
      setKeys(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function handleCreate() {
    if (creating) return
    setCreating(true)
    try {
      const res  = await fetch('/api/api-keys', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json() as ApiKeyRecord
      setNewKey(data)
      setShowModal(false)
      setNewName('')
      await fetchKeys()
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    confirm({
      title:       'Revogar API key',
      message:     'Esta API key será revogada imediatamente. Integrações que a usam vão parar de funcionar. Esta ação não pode ser desfeita.',
      confirmText: 'Revogar',
      variant:     'danger',
      onConfirm:   async () => {
        setRevoking(id)
        try {
          await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
          await fetchKeys()
        } finally {
          setRevoking(null)
        }
      },
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">API Keys</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            Use estas chaves para integrar o carrinho via API
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-ep-accent text-ep-base rounded-md text-sm font-medium hover:bg-ep-accent/90 transition-colors"
        >
          <Plus size={14} />
          Nova Key
        </button>
      </div>

      {/* Banner key recém-criada */}
      {newKey && <NewKeyBanner apiKey={newKey} onClose={() => setNewKey(null)} />}

      {/* Lista de keys */}
      <div className="bg-ep-surface border border-ep-border-default rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-ep-border-subtle">
            {Array.from({ length: 3 }).map((_, i) => <ListRowSkeleton key={i} cols={3} />)}
          </div>
        ) : keys.length === 0 ? (
          <div className="px-5 py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-ep-raised border border-ep-border-default flex items-center justify-center mx-auto">
              <Key size={20} className="text-ep-muted" />
            </div>
            <p className="text-ep-primary font-medium text-sm">Nenhuma API key criada</p>
            <p className="text-ep-muted text-xs">Crie uma key para integrar o carrinho via API</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ep-accent text-ep-base rounded-md text-sm font-medium hover:bg-ep-accent/90 transition-colors"
            >
              <Plus size={14} /> Nova Key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-ep-border-subtle">
            {keys.map(k => (
              <div key={k.id} className={clsx(
                'px-5 py-4 flex items-start gap-4 transition-colors',
                k.revokedAt ? 'opacity-60' : 'hover:bg-ep-raised/30',
              )}>
                {/* Ícone */}
                <div className={clsx(
                  'w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5',
                  k.revokedAt
                    ? 'bg-ep-overlay/30 border-ep-border-subtle'
                    : 'bg-ep-accent/10 border-ep-accent/20',
                )}>
                  <Key size={13} className={k.revokedAt ? 'text-ep-muted' : 'text-ep-accent'} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-ep-primary text-sm font-medium">{k.name || 'Sem nome'}</p>
                    {k.revokedAt ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-ep-danger/10 text-ep-danger border border-ep-danger/20 font-medium">
                        Revogada
                      </span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-ep-success/10 text-ep-success border border-ep-success/20 font-medium">
                        Ativa
                      </span>
                    )}
                  </div>

                  {/* Chave com blur */}
                  <KeyDisplay
                    value={k.keyPrefix}
                    revoked={!!k.revokedAt}
                  />

                  <p className="text-ep-muted text-xs">
                    Criada em {new Date(k.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {k.revokedAt && ` · Revogada em ${new Date(k.revokedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  </p>
                </div>

                {/* Ação */}
                {!k.revokedAt && (
                  <button
                    onClick={() => handleRevoke(k.id)}
                    disabled={revoking === k.id}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-colors flex-shrink-0 mt-0.5',
                      'border-ep-danger/30 text-ep-danger hover:bg-ep-danger/10 disabled:opacity-50',
                    )}
                  >
                    {revoking === k.id
                      ? <><Loader2 size={11} className="animate-spin" /> Revogando…</>
                      : <><Trash2  size={11} /> Revogar</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nova key */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setNewName('') } }}
        >
          <div className="bg-ep-surface border border-ep-border-default rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ep-border-subtle">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-ep-accent/10 border border-ep-accent/20 flex items-center justify-center">
                  <Key size={13} className="text-ep-accent" />
                </div>
                <h2 className="text-ep-primary font-semibold text-sm">Nova API Key</h2>
              </div>
              <button
                onClick={() => { setShowModal(false); setNewName('') }}
                className="text-ep-muted hover:text-ep-primary transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-ep-secondary text-xs font-medium">Nome (opcional)</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Loja Principal, Integração X"
                  className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <p className="text-ep-muted text-xs">Um nome ajuda a identificar onde esta key está a ser usada</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end px-5 py-4 border-t border-ep-border-subtle">
              <button
                onClick={() => { setShowModal(false); setNewName('') }}
                className="px-4 py-2 rounded-md border border-ep-border-default text-ep-secondary text-sm hover:text-ep-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-ep-accent text-ep-base text-sm font-medium hover:bg-ep-accent/90 disabled:opacity-50 transition-colors"
              >
                {creating && <Loader2 size={13} className="animate-spin" />}
                {creating ? 'Criando…' : 'Criar Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
