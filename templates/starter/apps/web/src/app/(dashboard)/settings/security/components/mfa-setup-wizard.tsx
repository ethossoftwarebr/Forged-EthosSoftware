'use client';

/**
 * MfaSetupWizard (D8.7) — modal 3 steps:
 *  1. Scan QR (lê `startMfaSetup()` ao abrir)
 *  2. Verify First Code (chama `confirmMfaSetup(code)`)
 *  3. Save Backup Codes (mostra 10 codes uma única vez)
 *
 * Guards (CLAUDE.md):
 *  - Backup codes JAMAIS persistem em localStorage — só state in-memory + cópia
 *    explícita do user. Após "Concluir" some pra sempre.
 *  - Wizard usa @ethos/ui Dialog (Radix). Sem libs UI prontas. Sem CSS-in-JS.
 *  - Mobile-first: QR 192px (12rem), grid de codes em 2 cols cabe em 375px.
 *
 * Concern documentado:
 *  - Se user cancelar no step 1 (após startMfaSetup), MfaSecret pendente fica
 *    órfão no DB (verifiedAt=null). Backend faz upsert na próxima call —
 *    re-uso é OK. Limpeza periódica (cron) fica como debt pós-v1.
 */

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Spinner,
} from '@ethos/ui';
import { Check, Copy, Download, KeyRound, Printer, ShieldCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { confirmMfaSetup, mfaErrorMessage, startMfaSetup, type MfaSetupResponse } from '@/lib/mfa';

interface MfaSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

export function MfaSetupWizard({ open, onOpenChange, onComplete }: MfaSetupWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [showManualSecret, setShowManualSecret] = useState(false);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

  // Reset interno sempre que o dialog (re)abre. Evita estado vazado entre sessões.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSetupData(null);
    setSetupError(null);
    setShowManualSecret(false);
    setCode('');
    setVerifyError(null);
    setBackupCodes([]);
    setConfirmedSaved(false);

    setLoadingSetup(true);
    startMfaSetup()
      .then((data) => {
        setSetupData(data);
      })
      .catch((err) => {
        setSetupError(mfaErrorMessage(err));
      })
      .finally(() => {
        setLoadingSetup(false);
      });
  }, [open]);

  function handleClose(next: boolean) {
    // Bloqueia fechamento acidental no step 3 antes de confirmar saved.
    if (!next && step === 3 && !confirmedSaved) {
      return;
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            Habilitar 2FA
          </DialogTitle>
          <DialogDescription>
            Passo {step} de 3 —{' '}
            {step === 1
              ? 'configure seu app'
              : step === 2
                ? 'verifique o código'
                : 'salve seus backup codes'}
            .
          </DialogDescription>
        </DialogHeader>

        <StepIndicator step={step} />

        {step === 1 ? (
          <StepScanQr
            loading={loadingSetup}
            error={setupError}
            data={setupData}
            showManualSecret={showManualSecret}
            onToggleManual={() => setShowManualSecret((v) => !v)}
            onCancel={() => onOpenChange(false)}
            onNext={() => setStep(2)}
          />
        ) : null}

        {step === 2 ? (
          <StepVerify
            code={code}
            onCodeChange={setCode}
            verifying={verifying}
            error={verifyError}
            onCancel={() => onOpenChange(false)}
            onBack={() => setStep(1)}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!/^\d{6}$/.test(code)) {
                setVerifyError('Digite o código de 6 dígitos.');
                return;
              }
              setVerifying(true);
              setVerifyError(null);
              try {
                const res = await confirmMfaSetup(code);
                setBackupCodes(res.backupCodes);
                setStep(3);
              } catch (err) {
                setVerifyError(mfaErrorMessage(err));
              } finally {
                setVerifying(false);
              }
            }}
          />
        ) : null}

        {step === 3 ? (
          <StepBackupCodes
            codes={backupCodes}
            confirmedSaved={confirmedSaved}
            onConfirmedSavedChange={setConfirmedSaved}
            onDone={onComplete}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = [1, 2, 3];
  return (
    <ol className="mt-2 flex items-center justify-between gap-2" aria-label="Progresso do wizard">
      {steps.map((s, idx) => {
        const isActive = s === step;
        const isDone = s < step;
        return (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-150',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isDone
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground',
              ].join(' ')}
              aria-current={isActive ? 'step' : undefined}
            >
              {isDone ? <Check className="h-3 w-3" aria-hidden="true" /> : s}
            </span>
            {idx < steps.length - 1 ? (
              <span
                className={[
                  'h-px flex-1 transition-colors duration-150',
                  s < step ? 'bg-primary' : 'bg-border',
                ].join(' ')}
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function StepScanQr({
  loading,
  error,
  data,
  showManualSecret,
  onToggleManual,
  onCancel,
  onNext,
}: {
  loading: boolean;
  error: string | null;
  data: MfaSetupResponse | null;
  showManualSecret: boolean;
  onToggleManual: () => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    if (!data?.secret) return;
    try {
      await navigator.clipboard.writeText(data.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard pode falhar (permissão / contexto não-seguro) — silencioso.
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-foreground text-sm">
        Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, 1Password,
        Microsoft Authenticator).
      </p>

      {loading ? (
        <div className="flex h-48 items-center justify-center" aria-live="polite" aria-busy="true">
          <Spinner />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : data ? (
        <>
          <img
            src={data.qrCodeDataUrl}
            alt="QR code para configurar o aplicativo autenticador"
            className="mx-auto h-48 w-48 rounded-md border bg-white p-2"
          />
          <button
            type="button"
            onClick={onToggleManual}
            className="text-primary block w-full text-center text-xs underline-offset-4 hover:underline"
          >
            {showManualSecret ? 'Esconder código manual' : 'Não consigo escanear'}
          </button>
          {showManualSecret ? (
            <div className="border-border rounded-md border p-3">
              <p className="text-muted-foreground mb-2 text-xs">Digite este código no seu app:</p>
              <div className="flex items-center gap-2">
                <code className="bg-muted text-foreground flex-1 break-all rounded px-2 py-1 font-mono text-sm">
                  {data.secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copySecret}
                  aria-label="Copiar código manual"
                  className="gap-1"
                >
                  {copied ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={onNext} disabled={loading || !data}>
          Próximo
        </Button>
      </DialogFooter>
    </div>
  );
}

function StepVerify({
  code,
  onCodeChange,
  verifying,
  error,
  onCancel,
  onBack,
  onSubmit,
}: {
  code: string;
  onCodeChange: (v: string) => void;
  verifying: boolean;
  error: string | null;
  onCancel: () => void;
  onBack: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Foco automático pra UX rápida (user acabou de gerar o code no app).
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-foreground text-sm">
        Insira o código de 6 dígitos exibido pelo seu app autenticador agora.
      </p>

      <div className="space-y-2">
        <Label htmlFor={inputId}>Código de verificação</Label>
        <Input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          pattern="\d{6}"
          placeholder="000000"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={verifying}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-11 text-center font-mono text-lg tracking-widest"
        />
        {error ? (
          <p id={errorId} role="alert" className="text-destructive text-xs">
            {error}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={verifying}>
          Cancelar
        </Button>
        <Button type="button" variant="outline" onClick={onBack} disabled={verifying}>
          Voltar
        </Button>
        <Button type="submit" loading={verifying} aria-busy={verifying}>
          Verificar
        </Button>
      </DialogFooter>
    </form>
  );
}

function StepBackupCodes({
  codes,
  confirmedSaved,
  onConfirmedSavedChange,
  onDone,
}: {
  codes: string[];
  confirmedSaved: boolean;
  onConfirmedSavedChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const checkboxId = useId();

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignorado: clipboard pode falhar
    }
  }

  function downloadTxt() {
    const blob = new Blob([codes.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ethos-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printCodes() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <Alert variant="warning">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Salve esses códigos AGORA</AlertTitle>
        <AlertDescription>
          Eles serão mostrados apenas uma vez. Use um deles caso perca acesso ao seu app
          autenticador. Cada código só pode ser usado uma vez.
        </AlertDescription>
      </Alert>

      <ul
        className="border-border bg-muted/30 grid grid-cols-2 gap-2 rounded-md border p-3"
        aria-label="Códigos de backup"
      >
        {codes.map((c) => (
          <li key={c} className="bg-background rounded px-2 py-1 text-center font-mono text-sm">
            {c}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copyAll} className="gap-1">
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? 'Copiado' : 'Copiar todos'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={downloadTxt} className="gap-1">
          <Download className="h-4 w-4" aria-hidden="true" />
          Baixar (.txt)
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={printCodes} className="gap-1">
          <Printer className="h-4 w-4" aria-hidden="true" />
          Imprimir
        </Button>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id={checkboxId}
          checked={confirmedSaved}
          onCheckedChange={(v) => onConfirmedSavedChange(v === true)}
        />
        <Label htmlFor={checkboxId} className="text-sm leading-tight">
          Confirmo que salvei os códigos em local seguro.
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" onClick={onDone} disabled={!confirmedSaved}>
          Concluir
        </Button>
      </DialogFooter>
    </div>
  );
}
