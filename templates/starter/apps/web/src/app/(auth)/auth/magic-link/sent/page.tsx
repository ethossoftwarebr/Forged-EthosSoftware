/**
 * Confirmação anti-enumeração do envio do magic link (D8.6.5).
 *
 * Server component intencional: nada aqui é interativo. O texto é
 * estático e o email mascarado vem da query — não revelamos se a conta
 * existe, só ecoamos o que o usuário digitou.
 *
 * V1 NÃO mostra botão "reenviar" pra não ajudar enumeração via spam.
 * Se o usuário quiser tentar de novo, volta pro /login.
 */

import { Mail } from 'lucide-react';
import Link from 'next/link';

import { maskEmail } from '@/lib/magic-link';

interface SentPageProps {
  searchParams?: { email?: string };
}

export default function MagicLinkSentPage({ searchParams }: SentPageProps): JSX.Element {
  const rawEmail = searchParams?.email ?? '';
  const masked = rawEmail ? maskEmail(rawEmail) : 'seu email';

  return (
    <div className="space-y-6 text-center">
      <div
        className="bg-primary/10 text-primary mx-auto flex h-12 w-12 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <Mail className="h-6 w-6" />
      </div>

      <header className="space-y-2">
        <h2 className="text-foreground text-xl font-semibold">Verifique seu email</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Se houver uma conta com <span className="text-foreground font-medium">{masked}</span>,
          você receberá um link de acesso em alguns instantes.
        </p>
        <p className="text-muted-foreground text-xs">
          O link expira em 15 minutos e só pode ser usado uma vez.
        </p>
      </header>

      <div className="text-sm">
        <Link
          href="/login"
          className="text-primary font-medium underline-offset-4 transition-colors duration-150 hover:underline"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
