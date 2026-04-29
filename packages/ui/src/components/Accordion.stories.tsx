import type { Meta, StoryObj } from '@storybook/react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './Accordion';

const meta: Meta<typeof Accordion> = {
  title: 'Layout/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Single: Story = {
  render: () => (
    <Accordion type="single" collapsible defaultValue="item-1" className="w-[480px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>O que é a Ethos Forge?</AccordionTrigger>
        <AccordionContent>
          Forge é o kit de partida proprietário da Ethos: monorepo, geradores de CRUD e biblioteca
          de UI customizada.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Posso customizar componentes?</AccordionTrigger>
        <AccordionContent>
          Sim — todos os componentes são publicados como código editável dentro do projeto cliente
          via shadcn-style.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Como funciona o multi-tenant?</AccordionTrigger>
        <AccordionContent>
          tenantId é propagado via AsyncLocalStorage e Prisma extension. Nunca vem do request body.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-[480px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Identidade visual</AccordionTrigger>
        <AccordionContent>
          Paleta Ethos com tokens HSL, dark mode nativo e radius de 8px universal.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Tipografia</AccordionTrigger>
        <AccordionContent>Inter ou Geist, sem mistura de famílias.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Animações</AccordionTrigger>
        <AccordionContent>Sempre 150–200ms ease-out.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[480px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Item habilitado</AccordionTrigger>
        <AccordionContent>Esse item abre normalmente.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2" disabled>
        <AccordionTrigger>Item desabilitado</AccordionTrigger>
        <AccordionContent>Conteúdo inacessível.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Outro item habilitado</AccordionTrigger>
        <AccordionContent>Funciona normalmente.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
