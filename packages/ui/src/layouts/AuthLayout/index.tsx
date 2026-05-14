import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { Card, CardContent } from '../../components/Card';
import { cn } from '../../lib/cn';

export interface AuthLayoutProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Logo no topo do card. ReactNode pra permitir SVG/Image custom. */
  logo?: ReactNode;
  /** Footer minimalista (links Termos, Privacidade, etc). */
  footer?: ReactNode;
  /** Conteudo principal (form de login/signup/etc). */
  children: ReactNode;
  /**
   * Largura maxima do card. Aceita qualquer classe Tailwind de width.
   * Default: `max-w-[400px]`.
   */
  maxWidth?: string;
}

const AuthLayout = forwardRef<HTMLDivElement, AuthLayoutProps>(
  ({ logo, footer, children, maxWidth, className, ...props }, ref) => (
    <div
      ref={ref}
      role="main"
      className={cn(
        'flex min-h-screen flex-col items-center justify-center px-4 py-8',
        'from-background via-muted/30 to-background bg-gradient-to-br',
        className,
      )}
      {...props}
    >
      <div className={cn('w-full', maxWidth ?? 'max-w-[400px]')}>
        {logo ? <div className="mb-6 flex justify-center">{logo}</div> : null}
        <Card className="border shadow-sm">
          <CardContent className="p-6 sm:p-8">{children}</CardContent>
        </Card>
        {footer ? (
          <div className="text-muted-foreground mt-6 text-center text-xs">{footer}</div>
        ) : null}
      </div>
    </div>
  ),
);
AuthLayout.displayName = 'AuthLayout';

export { AuthLayout };
