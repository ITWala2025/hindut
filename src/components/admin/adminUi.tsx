import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string
  icon: ReactNode
  delta?: string
  deltaPositive?: boolean
  accent?: 'orange' | 'amber' | 'green' | 'blue' | 'red'
}

const ACCENT_STYLES: Record<NonNullable<KpiCardProps['accent']>, string> = {
  orange: 'from-orange-100 to-amber-100 text-orange-700',
  amber: 'from-amber-100 to-yellow-100 text-amber-700',
  green: 'from-emerald-100 to-green-100 text-emerald-700',
  blue: 'from-sky-100 to-blue-100 text-sky-700',
  red: 'from-rose-100 to-red-100 text-rose-700',
}

export function KpiCard({
  label,
  value,
  icon,
  delta,
  deltaPositive,
  accent = 'orange',
}: KpiCardProps) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {label}
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-1.5">{value}</div>
            {delta && (
              <div
                className={cn(
                  'text-xs mt-1.5 font-semibold',
                  deltaPositive ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {deltaPositive ? '▲' : '▼'} {delta}
              </div>
            )}
          </div>
          <div
            className={cn(
              'rounded-xl p-3 bg-gradient-to-br shadow-sm',
              ACCENT_STYLES[accent],
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2
              className="text-xl md:text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function Th({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left font-semibold text-slate-700 bg-slate-50 border-b border-slate-200',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className = '',
  colSpan,
}: {
  children: ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td className={cn('px-4 py-3 text-slate-700', className)} colSpan={colSpan}>
      {children}
    </td>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="text-center py-12 px-4">
      {icon && <div className="flex justify-center text-slate-400 mb-3">{icon}</div>}
      <div className="font-semibold text-slate-700">{title}</div>
      {description && (
        <div className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          {description}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
