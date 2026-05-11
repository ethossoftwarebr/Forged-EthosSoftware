import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import AuthProvider from '@/providers/auth-provider';
import QueryProvider from '@/providers/query-provider';
import ToasterProvider from '@/providers/toaster-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'Ethos Forge Starter',
  description: 'Starter app gerado com Ethos Forge',
};

/**
 * Root layout — server component.
 *
 * Cadeia de providers: QueryProvider > AuthProvider > {children}.
 * Toaster (sonner) montado uma única vez aqui, top-right, com richColors.
 *
 * Sem `'use client'`: providers carregam JS apenas onde precisam (cada um
 * marca seu próprio `'use client'`). Mantém RSC streaming intacto.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
