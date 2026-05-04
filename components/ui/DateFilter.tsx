'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

export type DatePreset = 'hoje' | 'ontem' | '7d' | '15d' | '30d' | 'max' | 'custom'

export interface DateRange {
  start: string
  end: string
}

const DATA_TODAY = '2026-05-04'

export function getRange(preset: DatePreset, customStart?: string, customEnd?: string): DateRange {
  const sub = (days: number) => {
    const d = new Date(DATA_TODAY)
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }
  switch (preset) {
    case 'hoje':   return { start: DATA_TODAY, end: DATA_TODAY }
    case 'ontem':  return { start: sub(1),  end: sub(1)  }
    case '7d':     return { start: sub(6),  end: DATA_TODAY }
    case '15d':    return { start: sub(14), end: DATA_TODAY }
    case '30d':    return { start: sub(29), end: DATA_TODAY }
    case 'max':    return { start: '2020-01-01', end: DATA_TODAY }
    case 'custom': return { start: customStart || sub(29), end: customEnd || DATA_TODAY }
  }
}

export function presetLabel(preset: DatePreset, range: DateRange): string {
  if (preset === 'custom') {
    const fmt = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}` }
    return `${fmt(range.start)} – ${fmt(range.end)}`
  }
  const map: Record<DatePreset, string> = {
    hoje: 'Hoje', ontem: 'Ontem', '7d': '7 dias', '15d': '15 dias', '30d': '30 dias', max: 'Máximo', custom: '',
  }
  return map[preset]
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'hoje',  label: 'Hoje'           },
  { id: 'ontem', label: 'Ontem'          },
  { id: '7d',    label: 'Últimos 7 dias' },
  { id: '15d',   label: 'Últimos 15 dias'},
  { id: '30d',   label: 'Últimos 30 dias'},
  { id: 'max',   label: 'Máximo'         },
]

export interface DateFilterProps {
  preset: DatePreset
  customStart: string
  customEnd: string
  onChange: (preset: DatePreset, customStart?: string, customEnd?: string) => void
  compact?: boolean
}

export default function DateFilter({ preset, customStart, customEnd, onChange, compact = false }: DateFilterProps) {
  const [open,       setOpen]       = useState(false)
  const [localStart, setLocalStart] = useState(customStart || '2026-04-04')
  const [localEnd,   setLocalEnd]   = useState(customEnd   || DATA_TODAY)
  const ref = useRef<HTMLDivElement>(null)

  const range = getRange(preset, customStart, customEnd)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const handlePreset = (id: DatePreset) => {
    onChange(id)
    if (id !== 'custom') setOpen(false)
  }

  const handleApply = () => {
    onChange('custom', localStart, localEnd)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-all',
          open
            ? 'border-ep-accent bg-ep-accent/10 text-ep-accent'
            : 'border-ep-border-default bg-ep-surface text-ep-secondary hover:border-ep-border-accent/40 hover:text-ep-primary'
        )}
      >
        <Calendar size={13} className="flex-shrink-0" />
        <span className="whitespace-nowrap">{presetLabel(preset, range)}</span>
        <ChevronDown size={11} className={clsx('transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={clsx(
          'absolute z-50 mt-1.5 w-60 bg-ep-raised border border-ep-border-default rounded-lg shadow-2xl overflow-hidden',
          // Alinha à direita quando não tem espaço à esquerda
          'right-0',
        )}>
          <div className="p-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePreset(p.id)}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded text-sm transition-all',
                  preset === p.id
                    ? 'bg-ep-accent/10 text-ep-accent font-medium'
                    : 'text-ep-secondary hover:bg-ep-overlay hover:text-ep-primary'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="border-t border-ep-border-subtle p-3 space-y-3">
            <p className="text-ep-muted text-xs font-medium uppercase tracking-wide">Personalizado</p>
            <div className="space-y-2">
              <div>
                <label className="text-ep-secondary text-xs block mb-1">De</label>
                <input type="date" value={localStart} max={localEnd}
                  onChange={(e) => setLocalStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-ep-overlay border border-ep-border-default rounded text-ep-primary text-xs focus:outline-none focus:border-ep-accent"
                />
              </div>
              <div>
                <label className="text-ep-secondary text-xs block mb-1">Até</label>
                <input type="date" value={localEnd} min={localStart} max={DATA_TODAY}
                  onChange={(e) => setLocalEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-ep-overlay border border-ep-border-default rounded text-ep-primary text-xs focus:outline-none focus:border-ep-accent"
                />
              </div>
            </div>
            <button onClick={handleApply}
              className="w-full py-1.5 bg-ep-accent text-ep-base rounded text-xs font-semibold hover:bg-ep-accent-dark transition-colors">
              Aplicar período
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
