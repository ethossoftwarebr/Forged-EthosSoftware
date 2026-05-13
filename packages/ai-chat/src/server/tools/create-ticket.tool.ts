import { z } from 'zod';

import type { ToolDef } from '../../shared';

export interface CreatedTicket {
  id: string;
  title: string;
  description: string;
  status: 'open';
  createdAt: string;
}

interface CreateTicketInput {
  title: string;
  description: string;
}

const createTicketInput = z.object({
  title: z.string().min(1).max(200).describe('Título curto do ticket.'),
  description: z.string().min(1).max(5000).describe('Descrição detalhada do problema.'),
}) as unknown as z.ZodType<CreateTicketInput>;

/**
 * Demo tool — NÃO persiste em DB (V1, schema de tickets não existe ainda).
 * Retorna um mock pra exercitar o tools loop end-to-end.
 *
 * Factory pattern mantido pra consistência com `createSearchProductsTool` —
 * facilita migração futura quando schema de Ticket for adicionado.
 */
export function createTicketTool(): ToolDef<CreateTicketInput, CreatedTicket> {
  return {
    name: 'create_ticket',
    description:
      'Cria um ticket de suporte (mock — V1 não persiste). Use para demo do tools loop. Retorna `id` único + status `open`.',
    inputSchema: createTicketInput,
    handler: ({ title, description }) => {
      // ID estável-ish via Date.now + random (não usa `cuid` pra não puxar dep).
      const id = `ticket_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      return {
        id,
        title,
        description,
        status: 'open' as const,
        createdAt: new Date().toISOString(),
      };
    },
  };
}
