'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, GitFork, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/lib/hooks/useConfirm'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Toggle } from '@/components/ui/Toggle'
import type { FunnelRecord } from '@/lib/services/funnel.service'

interface Product {
  id:    string
  name:  string
  price: number
}

interface FunnelModalProps {
  open:     boolean
  funnel:   FunnelRecord | null
  products: Product[]
  onClose:  () => void
  onSave:   (data: Partial<FunnelRecord>) => Promise<void>
}

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

function FunnelModal({ open, funnel, products, onClose, onSave }: FunnelModalProps) {
  const isEdit = !!funnel
  const [name,        setName]        = useState('')
  const [productId,   setProductId]   = useState('')
  const [upsellId,    setUpsellId]    = useState('')
  const [upsellPrice, setUpsellPrice] = useState('')
  const [upsellTitle, setUpsellTitle] = useState('')
  const [upsellDesc,  setUpsellDesc]  = useState('')
  const [upsellImage, setUpsellImage] = useState('')
  const [enabled,     setEnabled]     = useState(true)
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    if (!open) return
    setName(funnel?.name        ?? '')
    setProductId(funnel?.productId  ?? '')
    setUpsellId(funnel?.upsellId   ?? '')
    setUpsellPrice(funnel ? String(funnel.upsellPrice / 100) : '')
    setUpsellTitle(funnel?.upsellTitle ?? '')
    setUpsellDesc(funnel?.upsellDesc  ?? '')
    setUpsellImage(funnel?.upsellImage ?? '')
    setEnabled(funnel?.enabled ?? true)
  }, [open, funnel])

  if (!open) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        name:        name.trim(),
        productId,
        upsellId,
        upsellPrice: Math.round(parseFloat(upsellPrice || '0') * 100),
        upsellTitle: upsellTitle.trim(),
        upsellDesc:  upsellDesc.trim(),
        upsellImage: upsellImage.trim(),
        enabled,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = name.trim() && productId && upsellId && productId !== upsellId

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-ep-surface border border-ep-border-default rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ep-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-ep-accent/10 border border-ep-accent/20 flex items-center justify-center">
              <GitFork size={14} className="text-ep-accent" />
            </div>
            <h2 className="text-ep-primary font-semibold text-sm">{isEdit ? 'Editar funil' : 'Novo funil'}</h2>
          </div>
          <button onClick={onClose} className="text-ep-muted hover:text-ep-primary transition-colors text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nome */}
          <div className="space-y-1">
            <label className="text-ep-secondary text-xs font-medium">Nome do funil</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Funil Principal, Upsell Produto A"
              autoFocus
              className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
            />
          </div>

          {/* Produto principal → Upsell */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1">
              <label className="text-ep-secondary text-xs font-medium">Produto principal</label>
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm focus:outline-none focus:border-ep-accent appearance-none"
              >
                <option value="">Selecionar…</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="pb-2">
              <ChevronRight size={16} className="text-ep-muted" />
            </div>
            <div className="space-y-1">
              <label className="text-ep-secondary text-xs font-medium">Produto de upsell</label>
              <select
                value={upsellId}
                onChange={e => setUpsellId(e.target.value)}
                className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm focus:outline-none focus:border-ep-accent appearance-none"
              >
                <option value="">Selecionar…</option>
                {products.filter(p => p.id !== productId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          {productId && upsellId && productId === upsellId && (
            <p className="text-ep-danger text-xs">O produto de upsell deve ser diferente do produto principal.</p>
          )}

          {/* Preço override */}
          <div className="space-y-1">
            <label className="text-ep-secondary text-xs font-medium">
              Preço do upsell <span className="text-ep-muted">(0 = usa o preço do produto)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted text-sm">€</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={upsellPrice}
                onChange={e => setUpsellPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
              />
            </div>
          </div>

          {/* Título e descrição */}
          <div className="space-y-1">
            <label className="text-ep-secondary text-xs font-medium">Título da oferta <span className="text-ep-muted">(opcional)</span></label>
            <input
              type="text"
              value={upsellTitle}
              onChange={e => setUpsellTitle(e.target.value)}
              placeholder="Ex: Oferta especial só para você!"
              className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-ep-secondary text-xs font-medium">Descrição <span className="text-ep-muted">(opcional)</span></label>
            <textarea
              value={upsellDesc}
              onChange={e => setUpsellDesc(e.target.value)}
              placeholder="Descreva o benefício do upsell…"
              rows={3}
              className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-ep-secondary text-xs font-medium">URL da imagem <span className="text-ep-muted">(opcional)</span></label>
            <input
              type="url"
              value={upsellImage}
              onChange={e => setUpsellImage(e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2 bg-ep-raised border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors font-mono"
            />
          </div>

          {/* Toggle ativo */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-ep-primary text-sm font-medium">Funil ativo</p>
              <p className="text-ep-muted text-xs">Funis inativos não redirecionam para upsell</p>
            </div>
            <Toggle checked={enabled} onChange={setEnabled} label="Funil ativo" />
          </div>
        </div>

        <div className="flex gap-2 justify-end px-5 py-4 border-t border-ep-border-subtle">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-ep-border-default text-ep-secondary text-sm hover:text-ep-primary transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="px-4 py-2 rounded-md bg-ep-accent text-ep-base text-sm font-medium hover:bg-ep-accent/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar funil'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FunisPage() {
  const [funnels,      setFunnels]      = useState<FunnelRecord[]>([])
  const [products,     setProducts]     = useState<Product[]>([])
  const [loading,      setLoading]      = useState(true)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editingFunnel,setEditingFunnel]= useState<FunnelRecord | null>(null)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const { confirmProps, confirm }       = useConfirm()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [fr, pr] = await Promise.all([
      fetch('/api/funnels').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
    ])
    setFunnels(fr)
    setProducts(Array.isArray(pr) ? pr : (pr.products ?? []))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const productName = (id: string) => products.find(p => p.id === id)?.name ?? id

  const handleOpenCreate = () => { setEditingFunnel(null); setModalOpen(true) }
  const handleOpenEdit   = (f: FunnelRecord) => { setEditingFunnel(f); setModalOpen(true) }

  const handleSave = async (data: Partial<FunnelRecord>) => {
    if (editingFunnel) {
      await fetch(`/api/funnels/${editingFunnel.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/funnels', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
    }
    await fetchAll()
  }

  const handleToggle = async (f: FunnelRecord) => {
    await fetch(`/api/funnels/${f.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !f.enabled }),
    })
    setFunnels(prev => prev.map(x => x.id === f.id ? { ...x, enabled: !x.enabled } : x))
  }

  const handleDelete = (f: FunnelRecord) => {
    confirm({
      title:       'Apagar funil',
      message:     `O funil "${f.name}" será removido permanentemente. Esta ação não pode ser desfeita.`,
      confirmText: 'Apagar',
      variant:     'danger',
      onConfirm:   async () => {
        setDeleting(f.id)
        await fetch(`/api/funnels/${f.id}`, { method: 'DELETE' })
        await fetchAll()
        setDeleting(null)
      },
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-ep-primary text-lg md:text-xl font-bold">Funis de Upsell</h1>
          <p className="text-ep-secondary text-xs md:text-sm mt-0.5">
            Configure ofertas pós-pagamento com 1 clique no mesmo cartão
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-3 py-2 bg-ep-accent text-ep-base rounded-md text-sm font-medium hover:bg-ep-accent/90 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus size={14} /> Novo funil
        </button>
      </div>

      {/* Info box */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 flex gap-3">
        <GitFork size={16} className="text-ep-accent flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-ep-primary text-sm font-medium">Como funciona o upsell 1-click</p>
          <p className="text-ep-secondary text-xs leading-relaxed">
            Após um pagamento aprovado, o cliente é redirecionado para uma página de oferta especial.
            Com 1 clique, o segundo produto é cobrado automaticamente no mesmo cartão — sem precisar digitar dados novamente.
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody><TableSkeleton rows={3} cols={5} widths={['160px','140px','140px','80px','60px']} /></tbody>
            </table>
          </div>
        ) : funnels.length === 0 ? (
          <div className="px-5 py-14 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-ep-raised border border-ep-border-default flex items-center justify-center mx-auto">
              <GitFork size={20} className="text-ep-muted" />
            </div>
            <p className="text-ep-primary font-medium text-sm">Nenhum funil criado</p>
            <p className="text-ep-muted text-xs">Crie um funil para exibir ofertas de upsell após o pagamento</p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-ep-accent text-ep-base rounded-md text-sm font-medium hover:bg-ep-accent/90 transition-colors"
            >
              <Plus size={14} /> Novo funil
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ep-border-subtle">
                  {['Nome', 'Produto principal', 'Upsell', 'Preço', 'Status', 'Ações'].map(h => (
                    <th key={h} className="text-left text-ep-muted text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {funnels.map(f => (
                  <tr key={f.id} className="border-b border-ep-border-subtle last:border-0 hover:bg-ep-raised/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-ep-primary text-sm font-medium">{f.name}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-ep-secondary text-sm">{productName(f.productId)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <ChevronRight size={12} className="text-ep-muted" />
                        <span className="text-ep-secondary text-sm">{productName(f.upsellId)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-ep-primary text-sm font-mono">
                        {f.upsellPrice > 0 ? fmt(f.upsellPrice) : <span className="text-ep-muted text-xs">Preço do produto</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleToggle(f)} className="flex items-center gap-1.5 text-xs transition-colors">
                        {f.enabled
                          ? <><ToggleRight size={16} className="text-ep-success" /><span className="text-ep-success">Ativo</span></>
                          : <><ToggleLeft  size={16} className="text-ep-muted"   /><span className="text-ep-muted">Inativo</span></>}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(f)}
                          className="p-1.5 rounded hover:bg-ep-raised text-ep-muted hover:text-ep-primary transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(f)}
                          disabled={deleting === f.id}
                          className="p-1.5 rounded hover:bg-ep-danger/10 text-ep-muted hover:text-ep-danger transition-colors disabled:opacity-40"
                          title="Apagar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FunnelModal
        open={modalOpen}
        funnel={editingFunnel}
        products={products}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
