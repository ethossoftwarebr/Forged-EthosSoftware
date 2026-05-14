'use client';

/**
 * /settings/security — gerencia MFA do user logado (D8.7).
 *
 * Client component porque:
 *  - Status (`enabled`, `backupCodesRemaining`) precisa ser refetched após
 *    enable/disable; SSR pré-renderizado ficaria stale.
 *  - Wizard e dialog manipulam estado interativo.
 *
 * Por que dentro do route group (dashboard): herda o sidebar/topbar via
 * `(dashboard)/layout.tsx` — mesma estética do resto do app.
 */

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from '@ethos/ui';
import { ShieldCheck, ShieldOff, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { MfaDisableDialog } from './components/mfa-disable-dialog';
import { MfaSetupWizard } from './components/mfa-setup-wizard';

import { fetchMfaStatus, type MfaStatusResponse } from '@/lib/mfa';

export default function SecuritySettingsPage() {
  const [status, setStatus] = useState<MfaStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchMfaStatus();
      setStatus(next);
    } catch {
      setError('Não foi possível carregar o status do MFA. Recarregue a página.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Segurança da conta</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie as opções de segurança da sua conta neste workspace.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            Autenticação em duas etapas (2FA)
          </CardTitle>
          <CardDescription>
            Proteja sua conta exigindo um código gerado pelo seu celular além da senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div
              className="text-muted-foreground flex items-center gap-2 text-sm"
              aria-live="polite"
              aria-busy="true"
            >
              <Spinner size="sm" /> Carregando status...
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : status?.enabled ? (
            <EnabledState status={status} onDisableClick={() => setDisableOpen(true)} />
          ) : (
            <DisabledState onEnableClick={() => setWizardOpen(true)} />
          )}
        </CardContent>
      </Card>

      <MfaSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={() => {
          setWizardOpen(false);
          void reload();
        }}
      />

      <MfaDisableDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        onConfirmed={() => {
          setDisableOpen(false);
          void reload();
        }}
      />
    </div>
  );
}

function EnabledState({
  status,
  onDisableClick,
}: {
  status: MfaStatusResponse;
  onDisableClick: () => void;
}) {
  const verifiedAt = status.verifiedAt ? formatDate(status.verifiedAt) : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="default" className="gap-1">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Ativado
        </Badge>
        {verifiedAt ? (
          <span className="text-muted-foreground text-xs">Habilitado em {verifiedAt}</span>
        ) : null}
      </div>
      <p className="text-foreground text-sm">
        {status.backupCodesRemaining > 0 ? (
          <>
            <strong>{status.backupCodesRemaining}</strong>{' '}
            {status.backupCodesRemaining === 1
              ? 'código de backup restante'
              : 'códigos de backup restantes'}
            .
          </>
        ) : (
          <span className="text-destructive">
            Nenhum código de backup restante. Desabilite e reabilite o 2FA para gerar novos.
          </span>
        )}
      </p>
      <Button variant="outline" onClick={onDisableClick} className="gap-2">
        <ShieldOff className="h-4 w-4" aria-hidden="true" />
        Desabilitar 2FA
      </Button>
    </div>
  );
}

function DisabledState({ onEnableClick }: { onEnableClick: () => void }) {
  return (
    <div className="space-y-4">
      <Badge variant="secondary">Desativado</Badge>
      <p className="text-muted-foreground text-sm">
        Recomendamos ativar a autenticação em duas etapas. Você precisará de um aplicativo
        autenticador (Google Authenticator, Authy, 1Password, Microsoft Authenticator).
      </p>
      <Button onClick={onEnableClick}>Habilitar 2FA</Button>
    </div>
  );
}

/**
 * Formata ISO date em PT-BR curto (DD/MM/YYYY HH:mm). Resiliente a strings
 * inválidas — retorna empty pra não vazar `Invalid Date` na UI.
 */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
