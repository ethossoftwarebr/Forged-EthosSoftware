import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, type LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '../lib/cn';

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      sm: 'h-4 w-4',
      default: 'h-6 w-6',
      lg: 'h-10 w-10',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

// Omit `size` from LucideProps because cva controls dimensions via Tailwind classes;
// the underlying SVG `size` prop (number) would conflict with our 'sm' | 'default' | 'lg' enum.
export interface SpinnerProps
  extends Omit<LucideProps, 'ref' | 'size'>, VariantProps<typeof spinnerVariants> {
  /** Accessible label announced by screen readers. Defaults to "Carregando". */
  label?: string;
}

const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, label = 'Carregando', ...props }, ref) => (
    <Loader2
      ref={ref}
      role="status"
      aria-label={label}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  ),
);
Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };
