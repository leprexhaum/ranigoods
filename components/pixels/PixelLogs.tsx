'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Trash2, CheckCircle2, XCircle, FlaskConical } from 'lucide-react'
import clsx from 'clsx'
import type { PixelFireLog, PixelPlatform } from '@/lib/types/pixel'

const PLATFORM_LABELS: Record<PixelPlatform, string> = {
  meta:       'Meta',
  ga4:        'GA4',
  google_ads: 'Google Ads',
  tiktok:     'TikTok',
}

const PLATFORM_COLORS: Record<PixelPlatform, string> = {
  meta:       'text-blue-400',
  ga4:        'text-ep-accent',
  google_ads: 'text-ep-warning',
  tiktok:     'text-ep-danger',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s atrás`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h atrás`
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function PixelLogs() {
  const [logs,     setLogs]     = useState<PixelFireLog[]>([])
  const [loading,  setLoading]  = useState(true)
  const [clearing, setClearing] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/pixels/logs?limit=100')
    const data = await res.json() as PixelFireLog[]
    setLogs(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const clearLogs = async () => {
    setClearing(true)
    await fetch('/api/pixels/logs', { method: 'DELETE' })
    setLogs([])
    setClearing(false)
  }

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-ep-border-subtle">
        <div>
          <h3 className="text-ep-primary font-semibold text-sm">Log de Eventos</h3>
          <p className="text-ep-secondary text-xs mt-0.5">{logs.length} disparo(s) registrado(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="p-1.5 text-ep-secondary hover:text-ep-accent rounded-md hover:bg-ep-raised transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={clearLogs}
            disabled={clearing || logs.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-ep-danger hover:bg-ep-danger/10 border border-transparent hover:border-ep-danger/20 rounded-md transition-colors disabled:opacity-40"
          >
            <Trash2 size={11} />
            Limpar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={16} className="animate-spin text-ep-muted" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-ep-primary text-sm font-medium">Nenhum evento registrado</p>
          <p className="text-ep-muted text-xs mt-1">Ative um pixel e dispare um evento de teste</p>
        </div>
      ) : (
        <div className="divide-y divide-ep-border-subtle max-h-[480px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-ep-raised/50 transition-colors">
              <div className="flex-shrink-0 mt-0.5">
                {log.success
                  ? <CheckCircle2 size={14} className="text-ep-success" />
                  : <XCircle      size={14} className="text-ep-danger"  />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('text-xs font-medium', PLATFORM_COLORS[log.platform])}>
                    {PLATFORM_LABELS[log.platform]}
                  </span>
                  <span className="text-ep-primary text-xs font-mono">{log.event}</span>
                  {log.isTest && (
                    <span className="flex items-center gap-0.5 text-xs text-ep-warning">
                      <FlaskConical size={9} />
                      teste
                    </span>
                  )}
                </div>
                <p className={clsx('text-xs mt-0.5', log.success ? 'text-ep-secondary' : 'text-ep-danger')}>
                  {log.message}
                </p>
                {log.data?.value !== undefined && (
                  <p className="text-ep-muted text-xs mt-0.5">
                    Valor: R$ {((log.data.value as number) / 100).toFixed(2)}
                  </p>
                )}
              </div>

              <span className="text-ep-muted text-xs flex-shrink-0">{timeAgo(log.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
