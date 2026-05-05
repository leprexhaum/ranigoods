import clsx from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx('bg-ep-raised animate-pulse rounded', className)} />
  )
}

// Skeleton de linha de tabela reutilizável
export function TableRowSkeleton({ cols = 5, widths }: { cols?: number; widths?: string[] }) {
  return (
    <tr className="border-b border-ep-border-subtle">
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-5 py-3.5">
          <div
            className="h-3 bg-ep-raised rounded animate-pulse"
            style={{ width: widths?.[j] ?? `${55 + (j * 13) % 35}%` }}
          />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 5, cols = 5, widths }: { rows?: number; cols?: number; widths?: string[] }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} widths={widths} />
      ))}
    </>
  )
}

// Skeleton de card de produto
export function ProductCardSkeleton() {
  return (
    <div className="bg-ep-surface border border-ep-border-default rounded-lg p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-md flex-shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="w-6 h-6 rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-2 pt-1 border-t border-ep-border-subtle">
        <Skeleton className="h-7 flex-1 rounded-md" />
        <Skeleton className="h-7 flex-1 rounded-md" />
      </div>
    </div>
  )
}

// Skeleton de linha de lista (api-keys, webhooks)
export function ListRowSkeleton({ cols = 2 }: { cols?: number }) {
  return (
    <div className="px-5 py-4 flex items-center gap-4 border-b border-ep-border-subtle last:border-0">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-16 rounded-md" />
      ))}
    </div>
  )
}
