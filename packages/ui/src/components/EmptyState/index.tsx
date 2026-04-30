import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../Button';

const iconWrapperVariants = cva(
  'flex h-12 w-12 items-center justify-center rounded-full [&>svg]:h-6 [&>svg]:w-6',
  {
    variants: {
      variant: {
        empty: 'bg-muted text-muted-foreground',
        error: 'bg-destructive/10 text-destructive',
        'search-no-results': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      },
    },
    defaultVariants: {
      variant: 'empty',
    },
  },
);

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof iconWrapperVariants> {
  title: string;
  description?: string;
  icon?: ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
}

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      variant = 'empty',
      icon,
      title,
      description,
      primaryAction,
      secondaryAction,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-12 text-center',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div aria-hidden="true" className={cn(iconWrapperVariants({ variant }))}>
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? <p className="text-muted-foreground max-w-sm text-sm">{description}</p> : null}
      {primaryAction || secondaryAction ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {primaryAction ? (
            <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
          ) : null}
          {secondaryAction ? (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';

export { EmptyState, iconWrapperVariants as emptyStateIconVariants };
