/**
 * axios instance com:
 *  - `withCredentials: true` (cookie httpOnly carrega o JWT — D7)
 *  - request interceptor injetando `X-Tenant-Slug` (D refresh)
 *  - response interceptor com refresh-token race-safe (mutex + queue)
 *
 * Guards (CLAUDE.md):
 *  - JWT JAMAIS em localStorage — só cookie httpOnly
 *  - tenant slug vai no header (NUNCA no body/query — backend lê do JWT)
 */

import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

import { tenantFromHost } from './auth';

import { useAuthStore } from '@/stores/auth-store';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// Request interceptor — injeta X-Tenant-Slug
// ============================================================================

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const slug = tenantFromHost();
  if (slug && !config.headers['X-Tenant-Slug']) {
    config.headers.set('X-Tenant-Slug', slug);
  }
  return config;
});

// ============================================================================
// Response interceptor — refresh-on-401 race-safe
// ============================================================================

/**
 * Marcador interno pra evitar loop infinito caso o próprio /auth/refresh
 * retorne 401 (o que indica refresh expirado → redireciona pro /login).
 */
interface RetriableConfig extends AxiosRequestConfig {
  _retried?: boolean;
}

// Mutex global de refresh: enquanto um refresh está em curso, qualquer outra
// request que receber 401 entra na fila e é reenviada após o refresh resolver.
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: () => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(error: unknown | null): void {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  pendingQueue = [];
}

async function performRefresh(): Promise<void> {
  // Header X-Tenant-Slug é obrigatório no /auth/refresh (auth.controller.ts L153).
  const slug = tenantFromHost();
  await api.post('/auth/refresh', {}, {
    headers: slug ? { 'X-Tenant-Slug': slug } : {},
    // Marca como retried pra interceptor NÃO tentar refresh recursivo se 401.
    _retried: true,
  } as RetriableConfig);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // Sem config (network error puro) ou não-401 → propaga.
    if (!original || status !== 401) {
      return Promise.reject(error);
    }

    // Já tentou refresh nessa request → falha definitiva.
    if (original._retried) {
      useAuthStore.getState().clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    original._retried = true;

    // Se outro refresh já está em curso, enfileira e espera.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: () => {
            api.request(original).then(resolve).catch(reject);
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      await performRefresh();
      flushQueue(null);
      return api.request(original);
    } catch (refreshErr) {
      flushQueue(refreshErr);
      useAuthStore.getState().clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);
