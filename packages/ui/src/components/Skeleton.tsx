import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('bg-muted animate-pulse rounded-md', className)} {...props} />
  ),
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };
