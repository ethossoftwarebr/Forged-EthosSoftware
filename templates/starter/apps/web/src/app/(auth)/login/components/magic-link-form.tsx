'use client';

/**
 * Formulário de Magic Link no /login (D8.6.5).
 *
 * Comportamento:
 *  - Input de email controlado + botão "Enviar link mágico".
 *  - Submit dispara `fetch` direto (NÃO axios) pra evitar o response
 *    interceptor de refresh-on-401 — o endpoint é público e responde
 *    `200 OK { ok: true }` mesmo com email inexistente, rate-limit (429
 *    é aceito como sinal anti-enum) ou provider desligado.
 *  - Qualquer resposta HTTP (2xx, 4xx, 5xx) → redireciona para
 *    `/auth/magic-link/sent?email=<email>`. Apenas erro de rede REAL
 *    (fetch throw) mostra mensagem inline e mantém o form usável.
 *  - `credentials: 'include'` permite ao backend setar/ler cookies de
 *    sessão se preciso, mas o fluxo principal não depende disso.
 *
 * Guards (CLAUDE.md):
 *  - tenantSlug NÃO vai no body. Backend resolve via Host header /
 *    X-Tenant-Slug (interceptor não é usado aqui, então o backend cai
 *    em Host header — comportamento esperado em produção).
 *  - Sem CSS-in-JS, só Tailwind. Touch target ≥44px (h-11).
 *  - aria-busy / aria-describedby pra leitor de tela.
 */

import { Button, Input } from '@ethos/ui';
import { Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, type FormEvent } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function MagicLinkForm() {
  const router = useRouter();
  const emailId = useId();
  const errorId = useId();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (loading) return;

    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setNetworkError('Informe um email válido.');
      return;
    }

    setNetworkError(null);
    setLoading(true);

    try {
      // Fire-and-forget anti-enum: qualquer HTTP response (200, 429, 4xx, 5xx)
      // leva pra /sent. Só network error real interrompe.
      await fetch(`${apiBaseUrl}/auth/magic-link/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
        credentials: 'include',
      });
      router.push(`/auth/magic-link/sent?email=${encodeURIComponent(trimmed)}`);
    } catch {
      setNetworkError('Não foi possível conectar ao servidor. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div className="space-y-2">
        <label htmlFor={emailId} className="text-foreground text-sm font-medium">
          Email
        </label>
        <Input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={networkError ? errorId : undefined}
          aria-invalid={networkError ? true : undefined}
          disabled={loading}
          required
          className="h-11"
        />
        {networkError ? (
          <p id={errorId} role="alert" className="text-destructive text-xs">
            {networkError}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="h-11 w-full gap-2"
        loading={loading}
        aria-busy={loading}
        aria-label="Enviar link mágico para o email informado"
      >
        {!loading ? <Mail aria-hidden="true" /> : null}
        <span>Enviar link mágico</span>
      </Button>
    </form>
  );
}
