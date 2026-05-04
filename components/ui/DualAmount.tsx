import { formatEUR, eurToBrlStr } from '@/lib/utils/currency'
import clsx from 'clsx'

interface Props {
  eurCents: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function DualAmount({ eurCents, size = 'md', className }: Props) {
  return (
    <div className={clsx('flex flex-col', className)}>
      <span className={clsx(
        'font-semibold text-ep-primary tabular-nums',
        size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-xs' : 'text-sm',
      )}>
        {formatEUR(eurCents)}
      </span>
      <span className={clsx(
        'text-ep-muted tabular-nums',
        size === 'lg' ? 'text-xs' : 'text-xs',
      )}>
        ≈ {eurToBrlStr(eurCents)}
      </span>
    </div>
  )
}
