'use client';

/**
 * /mfa/recover — página informativa (V1, D8.7).
 *
 * Decisão pragmática: NÃO há endpoint dedicado de "recovery via backup code
 * sem password". Backup codes só funcionam após password OK (geram mfaToken).
 * Por isso esta página é puramente informativa — orienta o usuário a:
 *   1. Voltar pra /login
 *   2. Digitar email + senha
 *   3. Na tela MFA, clicar "Usar código de backup"
 *
 * Reduz superfície de ataque (sem endpoint adicional) e mantém zero
 * "esqueci minha senha + perdi MFA" path por enquanto. Pós-v1 pode ser
 * upgrade pra fluxo via email de recuperação assinado.
 */

import { Alert, AlertDescription, AlertTitle, buttonVariants } from '@ethos/ui';
import { LifeBuoy, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function MfaRecoverPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <div className="text-primary flex justify-center">
          <LifeBuoy className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="text-foreground text-xl font-semibold">Recuperar acesso</h2>
        <p className="text-muted-foreground text-sm">
          Perdeu o app autenticador? Use um código de backup.
        </p>
      </header>

      <ol className="text-foreground space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            1
          </span>
          <span>Volte para a tela de login.</span>
        </li>
        <li className="flex gap-3">
          <span className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            2
          </span>
          <span>Digite seu email e senha normalmente.</span>
        </li>
        <li className="flex gap-3">
          <span className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            3
          </span>
          <span>
            Na tela de verificação, clique em <strong>“Usar código de backup”</strong> e digite um
            dos códigos que você salvou ao habilitar o 2FA.
          </span>
        </li>
      </ol>

      <Alert variant="warning">
        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Cada código só pode ser usado uma vez</AlertTitle>
        <AlertDescription>
          Após entrar, considere desabilitar e reabilitar o 2FA para gerar novos códigos de backup.
        </AlertDescription>
      </Alert>

      <div className="space-y-3 text-center text-sm">
        <Link href="/login" className={buttonVariants({ size: 'lg', className: 'h-11 w-full' })}>
          Voltar para o login
        </Link>
        <p className="text-muted-foreground">
          Não tem códigos de backup? Entre em contato com o administrador do workspace.
        </p>
      </div>
    </div>
  );
}
