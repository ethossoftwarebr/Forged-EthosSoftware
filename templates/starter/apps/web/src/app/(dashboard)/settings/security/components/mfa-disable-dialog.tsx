'use client';

/**
 * MfaDisableDialog (D8.7) — re-auth via senha + chama disableMfa.
 *
 * Guards:
 *  - Senha NUNCA persiste — só estado in-memory durante o submit.
 *  - Mobile-first; input 44px (h-11) pra touch.
 *  - aria-busy / aria-describedby pra acessibilidade.
 */

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@ethos/ui';
import { ShieldAlert, ShieldOff } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';

import { disableMfa, mfaErrorMessage } from '@/lib/mfa';

interface MfaDisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}

export function MfaDisableDialog({ open, onOpenChange, onConfirmed }: MfaDisableDialogProps) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordId = useId();
  const errorId = useId();

  // Reset estado quando o dialog reabre — evita vazar senha digitada e
  // qualquer mensagem de erro anterior.
  useEffect(() => {
    if (!open) return;
    setPassword('');
    setSubmitting(false);
    setError(null);
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (password.length === 0) {
      setError('Informe sua senha.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await disableMfa(password);
      onConfirmed();
    } catch (err) {
      setError(mfaErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5" aria-hidden="true" />
            Desabilitar 2FA
          </DialogTitle>
          <DialogDescription>
            Desabilitar a autenticação em duas etapas reduz a segurança da sua conta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Alert variant="warning">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Confirme sua senha</AlertTitle>
            <AlertDescription>
              Por segurança, digite sua senha para confirmar a desativação.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor={passwordId}>Senha</Label>
            <Input
              id={passwordId}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="h-11"
              required
            />
            {error ? (
              <p id={errorId} role="alert" className="text-destructive text-xs">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" loading={submitting} aria-busy={submitting}>
              Desabilitar 2FA
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
