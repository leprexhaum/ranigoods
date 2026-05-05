'use client'

import { useState, useEffect, useCallback } from 'react'
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { ListRowSkeleton } from '@/components/ui/Skeleton'

interface ApiKeyRecord {
  id:        string
  name:      string
  keyPrefix: string
  key?:      string
  createdAt: string
  revokedAt: string | null
}

export default function ApiKeysPage() {
  const [keys,        setKeys]        = useState<ApiKeyRecord[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showModal,   setShowModal]   = useState(false)
  const [newName,     setNewName]     = useState('')
  const [creating,    setCreating]    = useState(false)
  const [newKey,      setNewKey]      = useState<ApiKeyRecord | null>(null)
  const [copied,      setCopied]      = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [revoking,    setRevoking]    = useState<string | null>(null)
  const { confirmProps, confirm }     = useConfirm()

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
    setCreating(true)
    try {
      const res  = await fetch('/api/api-keys', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: newName }),
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

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function toggleVisible(id: string) {
    setVisibleKeys(v => ({ ...v, [id]: !v[id] }))
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
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
      {newKey && (
        <div className="bg-ep-success/10 border border-ep-success/30 rounded-lg p-4 space-y-2">
          <p className="text-ep-success text-sm font-semibold">Key criada — copie agora, não será exibida novamente</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-ep-surface border border-ep-border-default rounded px-3 py-2 text-xs font-mono text-ep-primary break-all">
              {newKey.key}
            </code>
            <button
              onClick={() => copyKey(newKey.key!)}
              className="flex-shrink-0 p-2 rounded border border-ep-border-default hover:border-ep-accent text-ep-secondary hover:text-ep-accent transition-colors"
            >
              {copied ? <Check size={14} className="text-ep-success" /> : <Copy size={14} />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-ep-muted text-xs hover:text-ep-secondary transition-colors">
            Fechar
          </button>
        </div>
      )}

      {/* Lista de keys */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
        {loading ? (
          <div className="divide-y divide-ep-border-subtle">
            {Array.from({ length: 3 }).map((_, i) => <ListRowSkeleton key={i} cols={3} />)}
          </div>
        ) : keys.length === 0 ? (
          <div className="px-5 py-10 text-center space-y-2">
            <Key size={28} className="mx-auto text-ep-muted" />
            <p className="text-ep-muted text-sm">Nenhuma API key criada ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-ep-border-subtle">
            {keys.map(k => (
              <div key={k.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-ep-primary text-sm font-medium">{k.name || 'Sem nome'}</p>
                    {k.revokedAt && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-ep-danger/10 text-ep-danger border border-ep-danger/20">
                        Revogada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-ep-muted">
                      {visibleKeys[k.id] ? k.keyPrefix + '…' : k.keyPrefix.slice(0, 6) + '••••••••••••••••'}
                    </code>
                    <button onClick={() => toggleVisible(k.id)} className="text-ep-muted hover:text-ep-secondary transition-colors">
                      {visibleKeys[k.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                  <p className="text-ep-muted text-xs">
                    Criada em {new Date(k.createdAt).toLocaleDateString('pt-PT')}
                    {k.revokedAt && ` · Revogada em ${new Date(k.revokedAt).toLocaleDateString('pt-PT')}`}
                  </p>
                </div>
                {!k.revokedAt && (
                  <button
                    onClick={() => handleRevoke(k.id)}
                    disabled={revoking === k.id}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-colors',
                      'border-ep-danger/30 text-ep-danger hover:bg-ep-danger/10 disabled:opacity-50',
                    )}
                  >
                    <Trash2 size={12} />
                    {revoking === k.id ? 'Revogando…' : 'Revogar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nova key */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-ep-surface border border-ep-border-default rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-ep-primary font-semibold">Nova API Key</h2>
            <div className="space-y-1.5">
              <label className="text-ep-secondary text-xs font-medium">Nome (opcional)</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex: Loja Principal"
                className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowModal(false); setNewName('') }}
                className="px-4 py-2 rounded-md border border-ep-border-default text-ep-secondary text-sm hover:text-ep-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 rounded-md bg-ep-accent text-ep-base text-sm font-medium hover:bg-ep-accent/90 disabled:opacity-50 transition-colors"
              >
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
