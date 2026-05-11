/**
 * Auth store (Zustand v4).
 *
 * IMPORTANTE: SEM `persist` middleware. A fonte da verdade da sessão é o
 * cookie httpOnly do backend — o store só guarda o user/tenant decodificados
 * em memória após o hidrato inicial (AuthProvider.useEffect → GET /users/me).
 *
 * Tipos inline (`User`/`Tenant`) — subset suficiente pra UI. Roles inline
 * pra evitar puxar `@ethos/auth` (server-side, depende de @ethos/database).
 */

import { create } from 'zustand';

export type AuthRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: AuthRole;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  locale: string | null;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  /**
   * `false` até o AuthProvider terminar o primeiro GET /users/me.
   * UI usa pra evitar flicker entre "loading" e "logged-out".
   */
  isHydrated: boolean;

  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setHydrated: (value: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isHydrated: false,

  setUser: (user) => set({ user }),
  setTenant: (tenant) => set({ tenant }),
  setHydrated: (value) => set({ isHydrated: value }),
  clear: () => set({ user: null, tenant: null }),
}));
