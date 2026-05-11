'use client';

import { Toaster } from '@ethos/ui';

/**
 * Wrapper client-only do Toaster (sonner).
 *
 * Razão: `@ethos/ui` re-exporta componentes que dependem de hooks
 * (DashboardLayout, etc). Quando o root layout (server component)
 * importa direto do barrel, o Next.js detecta `useState`/`useEffect`
 * em módulos transitivos e quebra o build. Isolando aqui mantém a
 * cadeia "server → client boundary" limpa.
 */
export default function ToasterProvider() {
  return <Toaster position="top-right" richColors closeButton />;
}
