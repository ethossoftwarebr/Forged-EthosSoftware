'use client';

/**
 * Callback OAuth Google — passthrough cliente.
 *
 * Em fluxo feliz, o backend processa o callback em `/auth/google/callback`
 * e emite 302 para `/dashboard` (sucesso) ou `/login?error=...` (falha) —
 * o usuário nunca renderiza esta página. Se chegou aqui no client (302
 * perdido, navegação manual, env desconfigurado), redireciona pra /login
 * com `oauth_callback_failed`.
 */

import { Spinner } from '@ethos/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GoogleCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login?error=oauth_callback_failed');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <Spinner size="lg" label="Conectando ao Google" />
      <p className="text-muted-foreground text-sm">Conectando ao Google...</p>
    </div>
  );
}
