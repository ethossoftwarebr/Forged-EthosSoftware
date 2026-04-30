import type { Meta, StoryObj } from '@storybook/react';

import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { Input } from '../../components/Input';
import { Label } from '../../components/Label';

import { AuthLayout } from './index';

const meta: Meta<typeof AuthLayout> = {
  title: 'Layouts/AuthLayout',
  component: AuthLayout,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AuthLayout>;

const EthosWordmark = () => (
  <div className="text-foreground text-2xl font-bold tracking-tight">Ethos</div>
);

const FooterLinks = () => (
  <span>
    <a href="#" className="hover:text-foreground underline-offset-4 hover:underline">
      Termos
    </a>
    {' · '}
    <a href="#" className="hover:text-foreground underline-offset-4 hover:underline">
      Privacidade
    </a>
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// Default — Login
// ─────────────────────────────────────────────────────────────────────────────
export const Default: Story = {
  render: () => (
    <AuthLayout logo={<EthosWordmark />} footer={<FooterLinks />}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">Entrar na sua conta</h1>
          <p className="text-muted-foreground text-sm">Use seu email corporativo para acessar.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" type="email" placeholder="voce@empresa.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">Senha</Label>
          <Input id="login-password" type="password" placeholder="••••••••" />
        </div>
        <Button type="submit" className="mt-2 w-full">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Signup — 3 fields + checkbox
// ─────────────────────────────────────────────────────────────────────────────
export const Signup: Story = {
  render: () => (
    <AuthLayout logo={<EthosWordmark />} footer={<FooterLinks />}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">Criar uma conta</h1>
          <p className="text-muted-foreground text-sm">
            Comece em menos de 1 minuto. Sem cartao de credito.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-name">Nome completo</Label>
          <Input id="signup-name" type="text" placeholder="Maria Silva" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" type="email" placeholder="voce@empresa.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signup-password">Senha</Label>
          <Input id="signup-password" type="password" placeholder="Minimo 8 caracteres" />
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="signup-terms" />
          <Label htmlFor="signup-terms" className="text-muted-foreground text-xs leading-snug">
            Li e aceito os Termos de uso e a Politica de privacidade.
          </Label>
        </div>
        <Button type="submit" className="mt-2 w-full">
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// ForgotPassword — 1 field + link voltar
// ─────────────────────────────────────────────────────────────────────────────
export const ForgotPassword: Story = {
  render: () => (
    <AuthLayout logo={<EthosWordmark />} footer={<FooterLinks />}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">Recuperar senha</h1>
          <p className="text-muted-foreground text-sm">
            Vamos enviar um link de recuperacao para o seu email.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="forgot-email">Email</Label>
          <Input id="forgot-email" type="email" placeholder="voce@empresa.com" />
        </div>
        <Button type="submit" className="mt-2 w-full">
          Enviar link de recuperacao
        </Button>
        <a
          href="#"
          className="text-muted-foreground hover:text-foreground text-center text-xs underline-offset-4 hover:underline"
        >
          Voltar para o login
        </a>
      </form>
    </AuthLayout>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// WithCustomLogo — SVG mock
// ─────────────────────────────────────────────────────────────────────────────
const CustomSvgLogo = () => (
  <svg
    viewBox="0 0 24 24"
    className="text-primary h-10 w-10"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 2 L2 7 L12 12 L22 7 Z" />
    <path d="M2 17 L12 22 L22 17" />
    <path d="M2 12 L12 17 L22 12" />
  </svg>
);

export const WithCustomLogo: Story = {
  render: () => (
    <AuthLayout logo={<CustomSvgLogo />}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">Bem-vindo de volta</h1>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="custom-email">Email</Label>
          <Input id="custom-email" type="email" placeholder="voce@empresa.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="custom-password">Senha</Label>
          <Input id="custom-password" type="password" />
        </div>
        <Button type="submit" className="mt-2 w-full">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  ),
};
