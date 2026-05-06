'use client'

import { useState } from 'react'
import { Save, Check, Loader2 } from 'lucide-react'
import clsx from 'clsx'

type Tab = 'seguranca'

const tabs: { id: Tab; label: string }[] = [
  { id: 'seguranca', label: 'Segurança' },
]


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
  const [activeTab, setActiveTab] = useState<Tab>('seguranca')
  const [saving, setSaving] = useState(false)
  // Segurança
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [passwordError,    setPasswordError]    = useState('')
  const [passwordOk,       setPasswordOk]       = useState(false)

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

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-ep-primary text-lg md:text-xl font-bold">Configurações</h1>
        <p className="text-ep-secondary text-xs md:text-sm mt-0.5">Gerencie sua conta e integrações</p>
      </div>

      <div className="max-w-2xl space-y-4">
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
