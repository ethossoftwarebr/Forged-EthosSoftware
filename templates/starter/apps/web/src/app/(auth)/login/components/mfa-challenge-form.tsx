'use client';

/**
 * MfaChallengeForm (D8.7) — step 2 do login após password OK.
 *
 * Comportamento:
 *  - Recebe `mfaToken` do parent (login/page.tsx).
 *  - Modo padrão: TOTP 6 dígitos numéricos.
 *  - Toggle "Usar código de backup" → input alfanumérico (typically 8 chars,
 *    mas backend aceita qualquer string não-vazia, então não travamos length).
 *  - Sucesso → cookies httpOnly setados pelo backend → redirect /dashboard.
 *  - Erro → mensagem inline PT-BR mapeada via `mfaErrorMessage`.
 *
 * Guards (CLAUDE.md):
 *  - `mfaToken` fica em prop (estado do parent) — NUNCA localStorage.
 *  - Sem CSS-in-JS; só Tailwind.
 *  - Touch target ≥44px (h-11).
 *  - Foco automático no input pra UX.
 */

import { Alert, AlertDescription, AlertTitle, Button, Input, Label } from '@ethos/ui';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { mfaErrorMessage, submitMfaChallenge } from '@/lib/mfa';

interface MfaChallengeFormProps {
  mfaToken: string;
}

export function MfaChallengeForm({ mfaToken }: MfaChallengeFormProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [isBackupCode]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = code.trim();
    if (trimmed.length === 0) {
      setError(isBackupCode ? 'Informe o código de backup.' : 'Digite o código de 6 dígitos.');
      return;
    }
    if (!isBackupCode && !/^\d{6}$/.test(trimmed)) {
      setError('Digite o código de 6 dígitos.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitMfaChallenge({ mfaToken, code: trimmed, isBackupCode });
      router.replace('/dashboard');
    } catch (err) {
      setError(mfaErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setIsBackupCode((v) => !v);
    setCode('');
    setError(null);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <div className="text-primary flex justify-center">
          <ShieldCheck className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="text-foreground text-xl font-semibold">Verificação em duas etapas</h2>
        <p className="text-muted-foreground text-sm">
          {isBackupCode
            ? 'Insira um dos seus códigos de backup.'
            : 'Insira o código de 6 dígitos do seu app autenticador.'}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor={inputId}>{isBackupCode ? 'Código de backup' : 'Código'}</Label>
          <Input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode={isBackupCode ? 'text' : 'numeric'}
            autoComplete={isBackupCode ? 'off' : 'one-time-code'}
            maxLength={isBackupCode ? 32 : 6}
            placeholder={isBackupCode ? 'XXXXXXXX' : '000000'}
            value={code}
            onChange={(e) => {
              const next = isBackupCode
                ? e.target.value.replace(/\s+/g, '').toUpperCase().slice(0, 32)
                : e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(next);
            }}
            disabled={submitting}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-11 text-center font-mono text-lg tracking-widest"
            required
          />
          {error ? (
            <p id={errorId} role="alert" className="text-destructive text-xs">
              {error}
            </p>
          ) : null}
        </div>

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full"
          loading={submitting}
          aria-busy={submitting}
        >
          Verificar
        </Button>
      </form>

      <div className="space-y-3 text-center text-sm">
        <button
          type="button"
          onClick={switchMode}
          disabled={submitting}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150 disabled:opacity-50"
        >
          <KeyRound className="h-3 w-3" aria-hidden="true" />
          {isBackupCode ? 'Usar app autenticador' : 'Usar código de backup'}
        </button>
        <Alert>
          <AlertTitle className="text-sm">Perdeu acesso ao app?</AlertTitle>
          <AlertDescription className="text-xs">
            Use um dos seus códigos de backup. Cada um pode ser usado apenas uma vez.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
