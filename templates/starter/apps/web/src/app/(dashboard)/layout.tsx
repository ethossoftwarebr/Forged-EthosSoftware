'use client';

import { DashboardLayout, defineSidebarConfig, type SidebarItemConfig } from '@ethos/ui';
import { LayoutDashboard, Package, Settings } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';

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

const sidebarItems: SidebarItemConfig[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: 'products',
    label: 'Products',
    href: '/products',
    icon: <Package className="h-4 w-4" />,
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="h-4 w-4" />,
  },
];

const sidebarConfig = defineSidebarConfig(sidebarItems);

function activeKeyFromPath(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/products')) return 'products';
  if (pathname.startsWith('/settings')) return 'settings';
  return undefined;
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
