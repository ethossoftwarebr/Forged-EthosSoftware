import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Button } from '../Button';

import { ConfirmDialogProvider } from './ConfirmDialogProvider';
import { useConfirm } from './useConfirm';

const meta: Meta = {
  title: 'Compostos/ConfirmDialog',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <ConfirmDialogProvider>
        <Story />
      </ConfirmDialogProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj;

const ResultBadge = ({ result }: { result: 'confirmed' | 'cancelled' | null }) => {
  if (!result) return null;
  return (
    <p className="text-muted-foreground mt-3 text-xs">
      Ultimo resultado: <span className="font-mono">{result}</span>
    </p>
  );
};

const DefaultDemo = () => {
  const confirm = useConfirm();
  const [result, setResult] = useState<'confirmed' | 'cancelled' | null>(null);
  return (
    <div className="flex flex-col items-start">
      <Button
        onClick={async () => {
          const ok = await confirm({
            title: 'Confirmar acao?',
            description: 'Voce tem certeza que deseja prosseguir com esta acao?',
          });
          setResult(ok ? 'confirmed' : 'cancelled');
        }}
      >
        Acao padrao
      </Button>
      <ResultBadge result={result} />
    </div>
  );
};

export const Default: Story = {
  render: () => <DefaultDemo />,
};

const DestructiveDemo = () => {
  const confirm = useConfirm();
  const [result, setResult] = useState<'confirmed' | 'cancelled' | null>(null);
  return (
    <div className="flex flex-col items-start">
      <Button
        variant="destructive"
        onClick={async () => {
          const ok = await confirm({
            title: 'Excluir item permanentemente?',
            description:
              'Esta acao nao pode ser desfeita. Todos os dados associados serao removidos.',
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
            variant: 'destructive',
          });
          setResult(ok ? 'confirmed' : 'cancelled');
        }}
      >
        Excluir
      </Button>
      <ResultBadge result={result} />
    </div>
  );
};

export const Destructive: Story = {
  render: () => <DestructiveDemo />,
};

const WarningDemo = () => {
  const confirm = useConfirm();
  const [result, setResult] = useState<'confirmed' | 'cancelled' | null>(null);
  return (
    <div className="flex flex-col items-start">
      <Button
        variant="outline"
        onClick={async () => {
          const ok = await confirm({
            title: 'Tem certeza?',
            description: 'Voce tem alteracoes nao salvas que serao perdidas.',
            confirmLabel: 'Continuar',
            variant: 'warning',
          });
          setResult(ok ? 'confirmed' : 'cancelled');
        }}
      >
        Continuar sem salvar
      </Button>
      <ResultBadge result={result} />
    </div>
  );
};

export const Warning: Story = {
  render: () => <WarningDemo />,
};

const InfoDemo = () => {
  const confirm = useConfirm();
  const [result, setResult] = useState<'confirmed' | 'cancelled' | null>(null);
  return (
    <div className="flex flex-col items-start">
      <Button
        variant="outline"
        onClick={async () => {
          const ok = await confirm({
            title: 'Continuar?',
            description: 'Esta operacao pode levar alguns minutos para completar.',
            variant: 'info',
          });
          setResult(ok ? 'confirmed' : 'cancelled');
        }}
      >
        Iniciar processo
      </Button>
      <ResultBadge result={result} />
    </div>
  );
};

export const Info: Story = {
  render: () => <InfoDemo />,
};

const NestedDemo = () => {
  const confirm = useConfirm();
  const [log, setLog] = useState<string[]>([]);

  const append = (msg: string) => setLog((prev) => [...prev, msg]);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        onClick={async () => {
          setLog([]);
          const wantsToProceed = await confirm({
            title: 'Publicar projeto?',
            description: 'Vamos confirmar duas vezes para esta acao critica.',
          });
          if (!wantsToProceed) {
            append('Cancelado no primeiro passo.');
            return;
          }
          append('Primeiro passo confirmado.');
          const reallySure = await confirm({
            title: 'Tem certeza absoluta?',
            description: 'Esta e a ultima chance de cancelar.',
            confirmLabel: 'Sim, publicar',
            variant: 'warning',
          });
          append(reallySure ? 'Publicado!' : 'Cancelado no segundo passo.');
        }}
      >
        Publicar (com confirmacao dupla)
      </Button>
      {log.length > 0 ? (
        <ul className="text-muted-foreground mt-2 text-xs">
          {log.map((line, i) => (
            <li key={i}>- {line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export const NestedExample: Story = {
  render: () => <NestedDemo />,
};
