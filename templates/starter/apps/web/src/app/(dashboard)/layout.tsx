'use client';

import { DashboardLayout } from '@ethos/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';

import { sidebarConfig } from '@/config/sidebar';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Layout do route group `(dashboard)` — client component.
 *
 * Por que client: o barrel `@ethos/ui` arrasta `DashboardLayout` (que usa
 * useState/useEffect via useSidebarState). Mesma pegadinha de `(auth)/layout`
 * — server component falha o build mesmo sem usar o hook diretamente.
 *
 * Guard: leitura do `useAuthStore` só ocorre após `isHydrated=true` (set pelo
 * AuthProvider após GET /users/me). Antes disso, renderiza `null` pra evitar
 * flicker entre "loading" e "logged-out".
 *
 * Sidebar config: movida para `@/config/sidebar` (D6 — entradas geradas pelo
 * `forge-page` ficam entre os marcadores AUTOGEN; Dashboard/Settings são manuais).
 */

// `UserMenuAction` não é exportado pelo barrel; alinhe inline com o union em
// `packages/ui/src/layouts/DashboardLayout/UserMenu.tsx`.
type UserMenuAction =
  | 'profile'
  | 'settings'
  | 'theme:light'
  | 'theme:dark'
  | 'theme:system'
  | 'signout';

/**
 * Resolve a `activeKey` da sidebar a partir do pathname atual.
 *
 * Heurística: o item com o `href` mais longo que prefixa o pathname vence
 * (evita "/products" colidir com "/products/new" — ambos batem, mas o gerador
 * de páginas só registra a raiz `/products` e queremos manter highlight nos
 * sub-paths também). Itens sem `href` (groups) são ignorados.
 */
function activeKeyFromPath(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  let bestKey: string | undefined;
  let bestLen = -1;
  for (const item of sidebarConfig) {
    if (!item.href) continue;
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (item.href.length > bestLen) {
        bestLen = item.href.length;
        bestKey = item.key;
      }
    }
  }
  return bestKey;
}

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const clear = useAuthStore((s) => s.clear);
  const router = useRouter();
  const pathname = usePathname();

  const activeKey = useMemo(() => activeKeyFromPath(pathname), [pathname]);

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace('/login');
    }
  }, [isHydrated, user, router]);

  const handleUserAction = useCallback(
    async (action: UserMenuAction) => {
      switch (action) {
        case 'signout': {
          try {
            await api.post('/auth/logout');
          } catch (err) {
            // Logout best-effort: cookie httpOnly some no servidor, mas ainda
            // queremos limpar o estado local mesmo se a request falhar.
            console.error('Logout request failed', err);
          }
          clear();
          router.replace('/login');
          return;
        }
        case 'settings':
        case 'profile': {
          router.push('/settings');
          return;
        }
        case 'theme:dark': {
          document.documentElement.classList.add('dark');
          return;
        }
        case 'theme:light': {
          document.documentElement.classList.remove('dark');
          return;
        }
        case 'theme:system': {
          // Stub minimalista: respeita prefers-color-scheme atual. Tema completo
          // (persistência + listener de mudança) fica pro prompt #18 (settings).
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
          return;
        }
      }
    },
    [clear, router],
  );

  if (!isHydrated || !user) {
    // Pre-hidrato: evita flicker. Pós-hidrato sem user: effect redireciona,
    // renderiza null pra evitar render do shell autenticado por um frame.
    return null;
  }

  return (
    <DashboardLayout
      config={sidebarConfig}
      logo={<span className="font-bold">Ethos</span>}
      productName={tenant?.name ?? 'Ethos Forge'}
      activeKey={activeKey}
      user={{
        name: user.name ?? user.email,
        email: user.email,
      }}
      onUserAction={handleUserAction}
    >
      {children}
    </DashboardLayout>
  );
}
