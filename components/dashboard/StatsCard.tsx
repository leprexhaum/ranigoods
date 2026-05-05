import { TrendingUp, TrendingDown } from 'lucide-react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  subValue?: string
  change?: number
  changeLabel?: string
  icon: LucideIcon
  accent?: 'default' | 'success' | 'danger' | 'warning' | 'info'
  loading?: boolean
}

const accentMap = {
  default: { icon: 'text-ep-accent',   bg: 'bg-ep-accent/10',   border: 'border-ep-accent/20'   },
  success: { icon: 'text-ep-success',  bg: 'bg-ep-success/10',  border: 'border-ep-success/20'  },
  danger:  { icon: 'text-ep-danger',   bg: 'bg-ep-danger/10',   border: 'border-ep-danger/20'   },
  warning: { icon: 'text-ep-warning',  bg: 'bg-ep-warning/10',  border: 'border-ep-warning/20'  },
  info:    { icon: 'text-ep-info',     bg: 'bg-ep-info/10',     border: 'border-ep-info/20'     },
}

export default function StatsCard({
  title,
  value,
  subValue,
  change,
  changeLabel,
  icon: Icon,
  accent  = 'default',
  loading = false,
}: StatsCardProps) {
  const colors     = accentMap[accent]
  const isPositive = change !== undefined && change >= 0

  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-lg p-4 md:p-5 hover:border-ep-border-accent/30 transition-colors min-w-0">
      <div className="flex items-start justify-between mb-3 gap-2">
        <p className="text-ep-secondary text-xs font-medium leading-snug">{title}</p>
        <div className={clsx(
          'w-8 h-8 md:w-9 md:h-9 rounded-md flex items-center justify-center flex-shrink-0',
          colors.bg, 'border', colors.border,
        )}>
          <Icon size={15} className={colors.icon} strokeWidth={2} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 mt-1">
          <div className="h-6 bg-ep-raised rounded animate-pulse w-3/4" />
          <div className="h-3 bg-ep-raised rounded animate-pulse w-1/2" />
        </div>
      ) : (
        <>
          <p
            className="text-ep-primary font-bold tracking-tight leading-tight min-w-0 truncate"
            style={{ fontSize: 'clamp(0.9rem, 1.4vw, 1.75rem)' }}
            title={value}
          >
            {value}
          </p>

          {subValue && (
            <p className="text-ep-muted text-xs mt-0.5 truncate" title={subValue}>
              ≈ {subValue}
            </p>
          )}

          {change !== undefined && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {isPositive ? (
                <TrendingUp size={12} className="text-ep-success flex-shrink-0" />
              ) : (
                <TrendingDown size={12} className="text-ep-danger flex-shrink-0" />
              )}
              <span className={clsx('text-xs font-medium', isPositive ? 'text-ep-success' : 'text-ep-danger')}>
                {isPositive ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-ep-muted text-xs hidden sm:inline">{changeLabel}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
