'use client';

import axios from 'axios';
import { useEffect, type ReactNode } from 'react';

import { api } from '@/lib/api-client';
import { useAuthStore, type User } from '@/stores/auth-store';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — hidrata o auth store na primeira montagem.
 *
 * Fluxo:
 *  1. GET /users/me (cookie httpOnly faz a auth)
 *  2. 200 → setUser(data) + setHydrated(true)
 *  3. 401 → setHydrated(true) sem user (Wave 3/4 redireciona p/ /login)
 *  4. erro inesperado → loga + setHydrated(true) pra UI sair do limbo
 *
 * Não renderiza loading global — quem precisa lê `isHydrated` do store.
 */
export default function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;

    async function hydrate(): Promise<void> {
      try {
        const { data } = await api.get<User>('/users/me');
        if (cancelled) return;
        setUser(data);
      } catch (err: unknown) {
        if (cancelled) return;
        // 401 esperado quando não há sessão — não logamos.
        if (!axios.isAxiosError(err) || err.response?.status !== 401) {
          console.error('[AuthProvider] hydrate failed', err);
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [setUser, setHydrated]);

  return <>{children}</>;
}
