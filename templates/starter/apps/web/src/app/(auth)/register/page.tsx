'use client';

import { FormBuilder, toast, type Field } from '@ethos/ui';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { api } from '@/lib/api-client';
import { useAuthStore, type User, type Tenant } from '@/stores/auth-store';

const registerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  tenantName: z.string().min(2, 'Nome do workspace é obrigatório'),
});

type RegisterValues = z.infer<typeof registerSchema>;

interface RegisterResponse {
  user: User;
  tenant: Tenant;
  roles: string[];
}

const fields: Field[] = [
  {
    name: 'name',
    label: 'Nome completo',
    type: 'text',
    placeholder: 'Seu nome',
    required: true,
  },
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
    helperText: 'Mínimo 8 caracteres',
    required: true,
  },
  {
    name: 'tenantName',
    label: 'Nome do workspace',
    type: 'text',
    placeholder: 'Minha Empresa',
    helperText: 'Identifica sua organização dentro do sistema',
    required: true,
  },
];

/**
 * Converte um nome livre em slug kebab-case alfanumérico
 * (compatível com a regex do RegisterDto: `^[a-z0-9-]+$`).
 */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64);
}

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setTenant = useAuthStore((s) => s.setTenant);

  async function handleSubmit(values: RegisterValues) {
    try {
      const { data } = await api.post<RegisterResponse>('/auth/register', {
        email: values.email,
        password: values.password,
        name: values.name,
        tenantSlug: slugify(values.tenantName),
        tenantName: values.tenantName,
      });
      setUser(data.user);
      setTenant(data.tenant);
      router.push('/dashboard');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error('Email já cadastrado');
        return;
      }
      toast.error('Não foi possível criar a conta. Tente novamente.');
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <h2 className="text-foreground text-xl font-semibold">Criar conta</h2>
        <p className="text-muted-foreground text-sm">Comece a usar o sistema em alguns segundos</p>
      </header>

      <FormBuilder
        schema={registerSchema}
        fields={fields}
        defaultValues={{ name: '', email: '', password: '', tenantName: '' }}
        onSubmit={handleSubmit}
        submitLabel="Criar conta"
      />

      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
