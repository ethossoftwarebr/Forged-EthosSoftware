'use client';

import { AuthLayout } from '@ethos/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Layout do route group `(auth)` — client component.
 *
 * Wrappa as páginas de login/register/forgot-password no AuthLayout
 * (card centralizado com gradient sutil). Logo placeholder até o
 * white-label module (#18); footer com links legais que ainda não
 * existem mas fazem parte do design system.
 *
 * Por que client e não server: o barrel `@ethos/ui` re-exporta
 * componentes que usam hooks (DashboardLayout, etc). Importar daqui
 * num server component faz o Next.js falhar o build mesmo sem usar
 * esses componentes. Custo: ~mais alguns kB de JS no bundle de auth.
 */
export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthLayout logo={<EthosLogo />} footer={<AuthFooter />}>
      {children}
    </AuthLayout>
  );
}

function EthosLogo() {
  return <h1 className="text-foreground text-2xl font-bold tracking-tight">Ethos</h1>;
}

function AuthFooter() {
  return (
    <nav className="flex items-center justify-center gap-4">
      <Link href="/terms" className="hover:text-foreground transition-colors duration-150">
        Termos
      </Link>
      <span aria-hidden className="text-muted-foreground/50">
        •
      </span>
      <Link href="/privacy" className="hover:text-foreground transition-colors duration-150">
        Privacidade
      </Link>
    </nav>
  );
}
