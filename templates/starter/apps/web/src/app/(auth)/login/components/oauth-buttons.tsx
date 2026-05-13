'use client';

/**
 * Bloco de botões OAuth no /login (D8.5.4).
 *
 * Comportamento:
 *  - Ao montar, consulta `/api/auth/providers` (W2). Cada provider habilitado
 *    vira um botão "Entrar com {label}".
 *  - Loading: renderiza skeletons (2 placeholders pra reservar layout).
 *  - Empty: retorna null (sem providers configurados, sem broken state).
 *  - Click: dispara `oauthSignIn(name)` que navega para `/api/auth/{name}`.
 *
 * Não enviamos tenant no link — backend resolve via header X-Tenant-Slug ou
 * host (D8.5.1). Ícones embutidos como SVG inline porque lucide-react não
 * tem brand icons (NOTE no return do agente).
 */

import { Button, Skeleton } from '@ethos/ui';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { fetchEnabledProviders, oauthSignIn, type OAuthProvider } from '@/lib/oauth';

const ICONS: Record<string, ReactNode> = {
  google: <GoogleIcon />,
  microsoft: <MicrosoftIcon />,
};

export function OAuthButtons() {
  const { data: providers, isLoading } = useQuery({
    queryKey: ['oauth', 'providers'],
    queryFn: fetchEnabledProviders,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Divider />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  const list = providers ?? [];
  if (list.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Divider />
      {list.map((provider: OAuthProvider) => (
        <Button
          key={provider.name}
          type="button"
          variant="outline"
          size="lg"
          className="h-11 w-full gap-2"
          onClick={() => oauthSignIn(provider.name)}
          aria-label={`Entrar com ${provider.label}`}
        >
          {ICONS[provider.name] ?? null}
          <span>Entrar com {provider.label}</span>
        </Button>
      ))}
    </div>
  );
}

function Divider() {
  return (
    <div className="relative" role="separator" aria-label="ou">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <span className="border-border w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background text-muted-foreground px-2">ou</span>
      </div>
    </div>
  );
}

/**
 * Logo oficial Google "G" multicolor (4 paths). SVG público.
 */
function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.3 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * Logo oficial Microsoft 4-square. SVG público.
 */
function MicrosoftIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M11.4 11.4H1V1h10.4v10.4Z" fill="#F25022" />
      <path d="M23 11.4H12.6V1H23v10.4Z" fill="#7FBA00" />
      <path d="M11.4 23H1V12.6h10.4V23Z" fill="#00A4EF" />
      <path d="M23 23H12.6V12.6H23V23Z" fill="#FFB900" />
    </svg>
  );
}
