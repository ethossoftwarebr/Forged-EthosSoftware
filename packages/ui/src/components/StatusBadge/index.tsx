import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      intent: {
        success: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
        warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
        error: 'border-transparent bg-red-500/15 text-red-700 dark:text-red-400',
        info: 'border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400',
        neutral: 'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      intent: 'neutral',
    },
  },
);

export interface StatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {
  /** Renderiza um dot circular antes do label, herdando a cor do texto. */
  dot?: boolean;
}

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, intent, dot = false, children, ...props }, ref) => (
    <span ref={ref} className={cn(statusBadgeVariants({ intent }), className)} {...props}>
      {dot ? <span aria-hidden="true" className="mr-1.5 h-2 w-2 rounded-full bg-current" /> : null}
      {children}
    </span>
  ),
);
StatusBadge.displayName = 'StatusBadge';

export { StatusBadge, statusBadgeVariants };
