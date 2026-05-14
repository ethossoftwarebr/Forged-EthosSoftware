'use client';

import { FormBuilder, toast, type Field } from '@ethos/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { z } from 'zod';

import { MagicLinkForm } from './components/magic-link-form';
import { OAuthButtons } from './components/oauth-buttons';

import { api } from '@/lib/api-client';
import { tenantFromHost } from '@/lib/auth';
import { MAGIC_LINK_ERROR_MESSAGES, isMagicLinkError } from '@/lib/magic-link';
import { OAUTH_ERROR_MESSAGES } from '@/lib/oauth';
import { useAuthStore, type User, type Tenant } from '@/stores/auth-store';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginResponse {
  user: User;
  tenant: Tenant;
  roles: string[];
}

const fields: Field[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'voce@empresa.com',
    required: true,
  },
  {
    name: 'password',
    label: 'Senha',
    type: 'password',
    placeholder: '••••••••',
    required: true,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setTenant = useAuthStore((s) => s.setTenant);

  async function handleSubmit(values: LoginValues) {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', {
        ...values,
        tenantSlug: tenantFromHost(),
      });
      setUser(data.user);
      setTenant(data.tenant);
      router.push('/dashboard');
    } catch {
      toast.error('Email ou senha inválidos');
    }
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <LoginErrorHandler />
      </Suspense>

      <header className="space-y-1 text-center">
        <h2 className="text-foreground text-xl font-semibold">Bem-vindo de volta</h2>
        <p className="text-muted-foreground text-sm">Entre com sua conta para continuar</p>
      </header>

      <FormBuilder
        schema={loginSchema}
        fields={fields}
        defaultValues={{ email: '', password: '' }}
        onSubmit={handleSubmit}
        submitLabel="Entrar"
      />

      <div className="space-y-3">
        <Divider label="ou" />
        <MagicLinkForm />
      </div>

      <OAuthButtons />

      <div className="space-y-3 text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground hover:text-foreground inline-block transition-colors duration-150"
        >
          Esqueceu a senha?
        </Link>
        <p className="text-muted-foreground">
          Não tem conta?{' '}
          <Link
            href="/register"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * D8.5.5 + D8.6.5 — Lê `?error=` UMA vez no mount, dispara toast em PT-BR
 * e limpa a URL pra não re-disparar em refresh. Resolve códigos `magic_*`
 * via `MAGIC_LINK_ERROR_MESSAGES` antes de cair no fallback OAuth, pra
 * evitar mensagem genérica enganosa pra erros de magic link.
 *
 * Isolado em componente próprio + Suspense pra que o Next.js consiga
 * prerender o /login como static (useSearchParams força CSR no parent —
 * Suspense permite bail-out só desse trecho).
 */
function LoginErrorHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    const error = searchParams.get('error');
    if (!error) return;
    handledRef.current = true;

    const oauthFallback = OAUTH_ERROR_MESSAGES.oauth_callback_failed ?? 'Erro ao entrar.';
    const message = isMagicLinkError(error)
      ? (MAGIC_LINK_ERROR_MESSAGES[error] ?? oauthFallback)
      : (OAUTH_ERROR_MESSAGES[error] ?? oauthFallback);

    toast.error(message);
    router.replace('/login');
  }, [router, searchParams]);

  return null;
}

/**
 * Divider visual "—— ou ——" reaproveitado pra separar credentials,
 * magic link e OAuth. Mesmo visual do oauth-buttons (consistência).
 */
function Divider({ label }: { label: string }) {
  return (
    <div className="relative" role="separator" aria-label={label}>
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <span className="border-border w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background text-muted-foreground px-2">{label}</span>
      </div>
    </div>
  );
}
