import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

export interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: ReactNode;
}

const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ className, title, description, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('mb-4 flex items-start justify-between gap-4', className)}
      {...props}
    >
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  ),
);
SectionHeader.displayName = 'SectionHeader';

export { SectionHeader };
