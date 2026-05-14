'use client';

/**
 * Passthrough do magic link no client (D8.6.7).
 *
 * Em fluxo feliz, o usuário clica no link do email
 * (`${API_URL}/auth/magic-link/verify?token=...`) e o backend:
 *   - 302 /dashboard (sucesso, com Set-Cookie de access/refresh), ou
 *   - 302 /login?error=magic_* (falha)
 *
 * Esta página existe como safety net: se algum proxy/CDN/QR-code-leitor
 * trouxe o usuário pra rota client `/auth/magic-link/verify` (rota web,
 * não API), nós reencaminhamos pra rota canônica do backend. Padrão
 * igual aos callbacks OAuth (D8.5).
 *
 * Sem token → redireciona pro /login com `magic_token_invalid`.
 */

import { Spinner } from '@ethos/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function MagicLinkVerifyPage(): JSX.Element {
  return (
    <Suspense fallback={<VerifyPlaceholder />}>
      <VerifyHandler />
    </Suspense>
  );
}

function VerifyHandler(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      router.replace('/login?error=magic_token_invalid');
      return;
    }

    if (typeof window === 'undefined') return;
    // `window.location.replace` força navegação cross-origin pro backend,
    // que responde com 302 + Set-Cookie. `router.replace` não serve aqui
    // (Next só roteia rotas client-side).
    const params = new URLSearchParams({ token, web_redirect: '1' });
    window.location.replace(`${apiBaseUrl}/auth/magic-link/verify?${params.toString()}`);
  }, [router, searchParams]);

  return <VerifyPlaceholder />;
}

function VerifyPlaceholder(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      {/* label removido do Spinner — texto já está no <p> abaixo (evita dupla leitura screen reader) */}
      <Spinner size="lg" />
      <p aria-live="polite" className="text-muted-foreground text-sm">
        Verificando seu link...
      </p>
    </div>
  );
}
