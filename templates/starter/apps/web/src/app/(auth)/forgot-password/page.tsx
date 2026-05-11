'use client';

import { FormBuilder, toast, type Field } from '@ethos/ui';
import Link from 'next/link';
import { z } from 'zod';

import { api } from '@/lib/api-client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

const fields: Field[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'voce@empresa.com',
    required: true,
  },
];

export default function ForgotPasswordPage() {
  async function handleSubmit(values: ForgotPasswordValues) {
    // Endpoint pode não existir ainda no backend — ignora erro de propósito.
    // UX padrão: nunca revelar se o email existe ou não.
    await api.post('/auth/forgot-password', values).catch(() => {
      /* noop — toast neutro abaixo */
    });
    toast.success('Se este email estiver cadastrado, enviaremos instruções em alguns minutos.');
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h2 className="text-foreground text-xl font-semibold">Recuperar senha</h2>
        <p className="text-muted-foreground text-sm">
          Informe seu email para receber as instruções de redefinição
        </p>
      </header>

      <FormBuilder
        schema={forgotPasswordSchema}
        fields={fields}
        defaultValues={{ email: '' }}
        onSubmit={handleSubmit}
        submitLabel="Enviar instruções"
      />

      <p className="text-center text-sm">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          Voltar ao login
        </Link>
      </p>
    </div>
  );
}
