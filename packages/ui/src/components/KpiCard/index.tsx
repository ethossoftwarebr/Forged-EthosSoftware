import { cva, type VariantProps } from 'class-variance-authority';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Card, CardContent, CardDescription, CardHeader } from '../Card';
import { Skeleton } from '../Skeleton';

import { Sparkline } from './Sparkline';

export type KpiTrendDirection = 'up' | 'down' | 'neutral';

export interface KpiTrend {
  value: number;
  direction: KpiTrendDirection;
  label?: string;
}

const accentVariants = cva('absolute left-0 top-0 bottom-0 w-1', {
  variants: {
    variant: {
      default: 'hidden',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      destructive: 'bg-red-500',
      info: 'bg-blue-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const trendColor: Record<KpiTrendDirection, string> = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-muted-foreground',
};

const TrendIcon = ({ direction }: { direction: KpiTrendDirection }) => {
  if (direction === 'up') return <TrendingUp className="h-3 w-3" aria-hidden="true" />;
  if (direction === 'down') return <TrendingDown className="h-3 w-3" aria-hidden="true" />;
  return <Minus className="h-3 w-3" aria-hidden="true" />;
};

export interface KpiCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof accentVariants> {
  label: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: KpiTrend;
  loading?: boolean;
  sparkline?: number[];
}

const KpiCard = forwardRef<HTMLDivElement, KpiCardProps>(
  (
    {
      className,
      variant = 'default',
      label,
      value,
      description,
      icon,
      trend,
      loading = false,
      sparkline,
      ...props
    },
    ref,
  ) => (
    <Card ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
      <span aria-hidden="true" className={cn(accentVariants({ variant }))} />
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        {icon ? (
          <div aria-hidden="true" className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="pb-3">
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <div className="text-3xl font-bold tracking-tight">{value}</div>
        )}
        {description ? <p className="text-muted-foreground mt-1 text-xs">{description}</p> : null}
        {trend ? (
          loading ? (
            <Skeleton className="mt-2 h-4 w-24" />
          ) : (
            <div
              className={cn(
                'mt-2 flex items-center gap-1 text-xs font-medium',
                trendColor[trend.direction],
              )}
            >
              <TrendIcon direction={trend.direction} />
              <span>
                {trend.value > 0 && trend.direction === 'up' ? '+' : ''}
                {trend.value}
                {trend.label ? ` ${trend.label}` : '%'}
              </span>
            </div>
          )
        ) : null}
      </CardContent>
      {sparkline && sparkline.length > 0 ? (
        <div aria-hidden="true" className="text-muted-foreground px-6 pb-3">
          <Sparkline data={sparkline} />
        </div>
      ) : null}
    </Card>
  ),
);
KpiCard.displayName = 'KpiCard';

export { KpiCard };
