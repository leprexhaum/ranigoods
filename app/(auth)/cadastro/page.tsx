'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, User, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const checks = [
    { label: 'Mínimo 6 caracteres',    ok: password.length >= 6    },
    { label: 'Letra maiúscula',         ok: /[A-Z]/.test(password)  },
    { label: 'Número',                  ok: /[0-9]/.test(password)  },
  ]

  const score = checks.filter(c => c.ok).length
  const colors = ['', 'bg-ep-danger', 'bg-ep-warning', 'bg-ep-success']

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score] : 'bg-ep-border-default'}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map(c => (
          <span key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? 'text-ep-success' : 'text-ep-muted'}`}>
            <CheckCircle2 size={10} className={c.ok ? 'opacity-100' : 'opacity-30'} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function CadastroPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: username.trim(), email: email.trim(), password }),
      })
      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Erro ao criar conta')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Card */}
      <div className="bg-ep-surface border border-ep-border-default rounded-lg p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src="/logo.png" alt="RaniGoods" width={160} height={42} className="object-contain" priority />
        </div>

        <div className="mb-6">
          <h1 className="text-ep-primary text-xl font-bold">Criar conta</h1>
          <p className="text-ep-muted text-xs mt-1">Comece a gerir seus pagamentos agora</p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 mb-5 bg-ep-danger/10 border border-ep-danger/20 rounded-md">
            <AlertCircle size={14} className="text-ep-danger flex-shrink-0 mt-0.5" />
            <p className="text-ep-danger text-xs">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Usuário */}
          <div>
            <label className="block text-ep-secondary text-xs font-medium mb-1.5">
              Usuário
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="seu_usuario"
                autoComplete="username"
                autoFocus
                required
                className="w-full pl-9 pr-3 py-2.5 bg-ep-base border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
              />
            </div>
            <p className="text-ep-muted text-xs mt-1">Apenas letras, números e _ (mínimo 3 caracteres)</p>
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-ep-secondary text-xs font-medium mb-1.5">
              E-mail
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-ep-base border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="block text-ep-secondary text-xs font-medium mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ep-muted" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                className="w-full pl-9 pr-10 py-2.5 bg-ep-base border border-ep-border-default rounded-md text-ep-primary text-sm placeholder-ep-muted focus:outline-none focus:border-ep-accent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ep-muted hover:text-ep-secondary transition-colors"
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-ep-accent text-ep-base text-sm font-bold rounded-md hover:bg-ep-accent-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        {/* Link login */}
        <p className="text-center text-ep-muted text-xs mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-ep-accent hover:text-ep-accent-light font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>

      {/* Rodapé */}
      <p className="text-center text-ep-muted text-xs mt-5 opacity-60">
        © 2026 RaniGoods. Todos os direitos reservados.
      </p>
    </div>
  )
}
