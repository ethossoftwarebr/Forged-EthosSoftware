import type { Meta, StoryObj } from '@storybook/react';
import { Bell, CreditCard, Globe, KeyRound, Plug, Shield, User, Users } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/Card';
import { Input } from '../../components/Input';
import { Label } from '../../components/Label';
import { Switch } from '../../components/Switch';

import type { SettingsSection } from './SettingsSidebar';

import { SettingsLayout } from './index';

const meta: Meta<typeof SettingsLayout> = {
  title: 'Layouts/SettingsLayout',
  component: SettingsLayout,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SettingsLayout>;

const baseSections: SettingsSection[] = [
  { key: 'account', label: 'Account', icon: <User className="h-4 w-4" /> },
  { key: 'billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" /> },
  { key: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
  { key: 'integrations', label: 'Integrations', icon: <Plug className="h-4 w-4" /> },
  { key: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
];

const PlaceholderSection = ({ title, description }: { title: string; description: string }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground text-sm">
        Conteudo desta secao seria renderizado aqui no app real.
      </p>
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// Default — 5 sections, mock content
// ─────────────────────────────────────────────────────────────────────────────
const DefaultDemo = () => {
  const [active, setActive] = useState('account');
  return (
    <SettingsLayout sections={baseSections} activeSection={active} onSectionChange={setActive}>
      <PlaceholderSection
        title={baseSections.find((s) => s.key === active)?.label ?? 'Configuracoes'}
        description="Ajuste as preferencias desta secao."
      />
    </SettingsLayout>
  );
};

export const Default: Story = {
  render: () => <DefaultDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// MobileResponsive — viewport 375px
// ─────────────────────────────────────────────────────────────────────────────
export const MobileResponsive: Story = {
  parameters: { viewport: { defaultViewport: 'mobile' } },
  render: () => <DefaultDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// WithSectionContent — children muda baseado em activeSection
// ─────────────────────────────────────────────────────────────────────────────
const WithSectionContentDemo = () => {
  const [active, setActive] = useState('account');

  const renderSection = () => {
    switch (active) {
      case 'account':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Suas informacoes pessoais.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-name">Nome</Label>
                <Input id="acc-name" defaultValue="Maria Silva" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-email">Email</Label>
                <Input id="acc-email" type="email" defaultValue="maria@empresa.com" />
              </div>
              <Button className="self-start">Salvar alteracoes</Button>
            </CardContent>
          </Card>
        );
      case 'billing':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Billing</CardTitle>
              <CardDescription>Plano atual e historico de cobranca.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Plano</span>
                <Badge>Pro</Badge>
              </div>
              <p className="text-muted-foreground text-sm">Proximo ciclo: 15 de maio de 2026.</p>
            </CardContent>
          </Card>
        );
      case 'team':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
              <CardDescription>Convide e gerencie membros.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button>Convidar membro</Button>
            </CardContent>
          </Card>
        );
      case 'integrations':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Conecte ferramentas externas.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span>WhatsApp</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Google Calendar</span>
                <Switch />
              </div>
            </CardContent>
          </Card>
        );
      case 'security':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Autenticacao em duas etapas e sessoes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span>2FA habilitado</span>
                <Switch defaultChecked />
              </div>
              <Button variant="outline" className="self-start">
                Encerrar todas as sessoes
              </Button>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <SettingsLayout sections={baseSections} activeSection={active} onSectionChange={setActive}>
      {renderSection()}
    </SettingsLayout>
  );
};

export const WithSectionContent: Story = {
  render: () => <WithSectionContentDemo />,
};

// ─────────────────────────────────────────────────────────────────────────────
// FullExample — 7 sections, content rico (stack de cards)
// ─────────────────────────────────────────────────────────────────────────────
const fullSections: SettingsSection[] = [
  { key: 'account', label: 'Account', icon: <User className="h-4 w-4" /> },
  { key: 'billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" /> },
  { key: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
  { key: 'integrations', label: 'Integrations', icon: <Plug className="h-4 w-4" /> },
  { key: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { key: 'api-keys', label: 'API keys', icon: <KeyRound className="h-4 w-4" /> },
];

const FullExampleDemo = () => {
  const [active, setActive] = useState('account');
  return (
    <SettingsLayout
      sections={fullSections}
      activeSection={active}
      onSectionChange={setActive}
      title="Configuracoes da empresa"
    >
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Dados da organizacao</CardTitle>
            <CardDescription>Visiveis para todos os membros.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-name">Nome da empresa</Label>
              <Input id="org-name" defaultValue="Ethos Software" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="org-domain">Dominio</Label>
              <Input id="org-domain" defaultValue="ethos.dev" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Localizacao</CardTitle>
            <CardDescription>Fuso horario e idioma padrao.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Globe className="text-muted-foreground h-4 w-4" />
              <span>Sao Paulo (UTC-3)</span>
            </div>
            <p className="text-muted-foreground">Idioma: Portugues (Brasil)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preferencias</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Notificar por email diariamente</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span>Compartilhar telemetria anonima</span>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
};

export const FullExample: Story = {
  render: () => <FullExampleDemo />,
};
