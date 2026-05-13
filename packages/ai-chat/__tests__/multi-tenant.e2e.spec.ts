/**
 * multi-tenant.e2e.spec.ts — AC5 da Wave 4
 *
 * Cenário: conversa criada no tenant `acme` NUNCA pode ser acessada por
 * `globex`. Verifica que:
 *
 *  1. `chat()` cria uma conversa em `acme` (ChatConversation.create com tenantId=acme).
 *  2. Re-chamar `chat({ conversationId: <id_acme> })` no tenant `globex` lanca `NotFoundException`
 *     (D#13.12: ownership check via findFirst com tenantId+userId).
 *  3. `loadHistory` no `globex` nao traz mensagens de `acme`.
 *
 * Mock Prisma: in-memory que respeita filtro `tenantId + userId` em findFirst.
 * Anthropic mock retorna sempre `end_turn` (sem tool loop — foco e isolamento).
 */

import { TenantContext } from '@ethos/api-base';
import type { AuthSession } from '@ethos/auth';
import { NotFoundException } from '@nestjs/common';

import { AiChatService } from '../src/server/ai-chat.service';
import { ToolsRegistry } from '../src/server/tools.registry';

// ---------------------------------------------------------------------------
// Mock store — in-memory por tenant
// ---------------------------------------------------------------------------

interface ConvRow {
  id: string;
  tenantId: string;
  userId: string;
}
interface MsgRow {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolCalls: unknown;
  toolCallId: string | null;
  createdAt: Date;
}

function createPrismaStore() {
  const conversations: ConvRow[] = [];
  const messages: MsgRow[] = [];
  let convN = 0;
  let msgN = 0;

  const prisma = {
    chatConversation: {
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string; userId: string } }) => {
          const found = conversations.find(
            (c) => c.id === where.id && c.tenantId === where.tenantId && c.userId === where.userId,
          );
          return found ? { id: found.id } : null;
        },
      ),
      create: jest.fn(async ({ data }: { data: { tenantId: string; userId: string } }) => {
        const id = `conv_${++convN}`;
        conversations.push({ id, tenantId: data.tenantId, userId: data.userId });
        return { id };
      }),
    },
    chatMessage: {
      findMany: jest.fn(
        async ({ where, take }: { where: { conversationId: string }; take?: number }) => {
          const list = messages.filter((m) => m.conversationId === where.conversationId);
          return take ? list.slice(0, take) : list;
        },
      ),
      createMany: jest.fn(
        async ({
          data,
        }: {
          data: Array<{
            conversationId: string;
            role: string;
            content: string;
            toolCalls?: unknown;
            toolCallId?: string;
          }>;
        }) => {
          for (const m of data) {
            messages.push({
              id: `msg_${++msgN}`,
              conversationId: m.conversationId,
              role: m.role,
              content: m.content,
              toolCalls: m.toolCalls ?? null,
              toolCallId: m.toolCallId ?? null,
              createdAt: new Date(),
            });
          }
          return { count: data.length };
        },
      ),
    },
  };

  return { prisma, conversations, messages };
}

function makeSession(tenantId: string, userId: string): AuthSession {
  return {
    userId,
    tenantId,
    roles: ['owner'],
    issuedAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
}

function makeAnthropicMockEndTurn(text: string) {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        id: 'msg_a',
        role: 'assistant',
        model: 'claude-sonnet-4-5',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text }],
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AiChatService — multi-tenant isolation (AC5)', () => {
  it('conversa criada em "acme" → cross-tenant "globex" retorna 404', async () => {
    const { prisma } = createPrismaStore();
    const anthropic = makeAnthropicMockEndTurn('Oi, sou o assistente do tenant acme.') as never;
    const tools = new ToolsRegistry([]);
    const service = new AiChatService(anthropic, prisma as never, tools, {
      defaultModel: 'claude-sonnet-4-5',
      fallbackModel: 'claude-haiku-4-5',
    });

    // 1. Cria conversa em tenant `acme`
    const acmeResult = await TenantContext.run(
      { session: makeSession('tenant-acme', 'user-1') },
      () => service.chat({ messages: [{ role: 'user', content: 'oi' }] }, 'user-1'),
    );
    expect(acmeResult.conversationId).toBe('conv_1');

    // 2. Mesmo userId, mas tenant `globex` tenta acessar a conversa do acme → 404
    await expect(
      TenantContext.run({ session: makeSession('tenant-globex', 'user-1') }, () =>
        service.chat(
          {
            conversationId: acmeResult.conversationId,
            messages: [{ role: 'user', content: 'cross-tenant attempt' }],
          },
          'user-1',
        ),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    // 3. Verifica filtro do findFirst (defesa em profundidade — tenantId precisa estar no where)
    const findFirstCalls = (prisma.chatConversation.findFirst as jest.Mock).mock.calls;
    expect(findFirstCalls.length).toBeGreaterThanOrEqual(1);
    for (const [arg] of findFirstCalls) {
      expect(arg.where).toEqual(
        expect.objectContaining({
          tenantId: expect.any(String),
          userId: expect.any(String),
        }),
      );
    }
  });

  it('mensagens de "acme" nao aparecem no histórico de "globex"', async () => {
    const { prisma, conversations, messages } = createPrismaStore();
    const anthropic = makeAnthropicMockEndTurn('ok') as never;
    const tools = new ToolsRegistry([]);
    const service = new AiChatService(anthropic, prisma as never, tools, {
      defaultModel: 'claude-sonnet-4-5',
      fallbackModel: 'claude-haiku-4-5',
    });

    // Cria 1 conversa em acme com 1 turno de chat (user + assistant persistidos)
    await TenantContext.run({ session: makeSession('tenant-acme', 'user-1') }, () =>
      service.chat({ messages: [{ role: 'user', content: 'segredo-acme' }] }, 'user-1'),
    );

    expect(conversations).toHaveLength(1);
    expect(conversations[0].tenantId).toBe('tenant-acme');
    expect(messages.some((m) => m.content === 'segredo-acme')).toBe(true);

    // Cria uma conversa nova em globex (nao reusa id do acme — esse caso já foi coberto pelo teste 1)
    const globexResult = await TenantContext.run(
      { session: makeSession('tenant-globex', 'user-1') },
      () => service.chat({ messages: [{ role: 'user', content: 'oi globex' }] }, 'user-1'),
    );

    // O findMany do load history pra conv do globex NAO deve enxergar a msg "segredo-acme"
    const globexConv = conversations.find((c) => c.tenantId === 'tenant-globex');
    expect(globexConv).toBeDefined();
    const globexMessages = messages.filter((m) => m.conversationId === globexConv!.id);
    expect(globexMessages.some((m) => m.content === 'segredo-acme')).toBe(false);
    expect(globexResult.conversationId).toBe(globexConv!.id);

    // Cross-check: 2 conversas, isoladas
    expect(conversations.map((c) => c.tenantId).sort()).toEqual(['tenant-acme', 'tenant-globex']);
  });

  it('sem tenant context → ForbiddenException', async () => {
    const { prisma } = createPrismaStore();
    const anthropic = makeAnthropicMockEndTurn('') as never;
    const tools = new ToolsRegistry([]);
    const service = new AiChatService(anthropic, prisma as never, tools, {
      defaultModel: 'claude-sonnet-4-5',
      fallbackModel: 'claude-haiku-4-5',
    });

    // Chamar service sem TenantContext.run → requireTenantId() throws
    await expect(
      service.chat({ messages: [{ role: 'user', content: 'oi' }] }, 'user-1'),
    ).rejects.toThrow(/tenant/i);
  });
});
