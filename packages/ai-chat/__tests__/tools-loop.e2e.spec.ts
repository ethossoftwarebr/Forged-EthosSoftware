/**
 * tools-loop.e2e.spec.ts — AC4 da Wave 4
 *
 * Cenário: o modelo retorna `stop_reason=tool_use` no primeiro turn, o service
 * executa a tool (`search_products`), appenda o `tool_result`, e o modelo
 * fecha com `stop_reason=end_turn`. Verifica que:
 *
 *  1. `Anthropic.messages.create` foi chamado 2x (loop convergiu).
 *  2. `prisma.product.findMany` foi chamado com `tenantId` correto + filtro por nome.
 *  3. A mensagem final do assistant tem o texto esperado e foi persistida.
 *
 * Mocks: PrismaClient (in-memory) + Anthropic SDK (jest.fn). Nao bate API real
 * nem DB real. Tenant context populado via `TenantContext.run(...)`.
 */

import { TenantContext } from '@ethos/api-base';
import type { AuthSession } from '@ethos/auth';

import { AiChatService, AI_CHAT_OPTIONS_TOKEN } from '../src/server/ai-chat.service';
import { createSearchProductsTool } from '../src/server/tools/search-products.tool';
import { ToolsRegistry } from '../src/server/tools.registry';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

interface MockPrismaState {
  conversations: Array<{ id: string; tenantId: string; userId: string }>;
  messages: Array<{
    id: string;
    conversationId: string;
    role: string;
    content: string;
    toolCalls: unknown;
    toolCallId: string | null;
    createdAt: Date;
  }>;
  products: Array<{
    id: string;
    tenantId: string;
    name: string;
    sku: string;
    price: { toString: () => string };
  }>;
}

function createMockPrisma(state: MockPrismaState, findManySpy: jest.Mock) {
  let convCounter = 0;
  let msgCounter = 0;
  return {
    chatConversation: {
      findFirst: jest.fn(
        async ({ where }: { where: { id: string; tenantId: string; userId: string } }) => {
          const found = state.conversations.find(
            (c) => c.id === where.id && c.tenantId === where.tenantId && c.userId === where.userId,
          );
          return found ?? null;
        },
      ),
      create: jest.fn(async ({ data }: { data: { tenantId: string; userId: string } }) => {
        const id = `conv_${++convCounter}`;
        const created = { id, tenantId: data.tenantId, userId: data.userId };
        state.conversations.push(created);
        return { id };
      }),
    },
    chatMessage: {
      findMany: jest.fn(
        async ({ where, take }: { where: { conversationId: string }; take?: number }) => {
          const list = state.messages.filter((m) => m.conversationId === where.conversationId);
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
            state.messages.push({
              id: `msg_${++msgCounter}`,
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
    product: {
      findMany: findManySpy,
    },
  };
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

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

describe('AiChatService — tools loop (AC4)', () => {
  it('executa tool_use → tool_result → end_turn e persiste a resposta final', async () => {
    // ----- State -----
    const tenantId = 'tenant-1';
    const userId = 'user-1';
    const state: MockPrismaState = {
      conversations: [],
      messages: [],
      products: [
        {
          id: 'p1',
          tenantId,
          name: 'Caneta Bic Azul',
          sku: 'B-001',
          price: { toString: () => '2.5' },
        },
        {
          id: 'p2',
          tenantId,
          name: 'Caneta Pilot Preta',
          sku: 'P-002',
          price: { toString: () => '4.9' },
        },
      ],
    };

    // ----- Prisma mock -----
    const findManySpy = jest.fn(
      async ({
        where,
        take,
      }: {
        where: { tenantId: string; name: { contains: string } };
        take?: number;
      }) => {
        const list = state.products.filter(
          (p) =>
            p.tenantId === where.tenantId &&
            p.name.toLowerCase().includes(where.name.contains.toLowerCase()),
        );
        return take ? list.slice(0, take) : list;
      },
    );
    const prisma = createMockPrisma(state, findManySpy);

    // ----- Anthropic mock — 2 turns -----
    const anthropicCreate = jest
      .fn()
      // Turn 1: tool_use
      .mockResolvedValueOnce({
        id: 'msg_1',
        role: 'assistant',
        model: 'claude-sonnet-4-5',
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'search_products',
            input: { query: 'caneta', limit: 10 },
          },
        ],
      })
      // Turn 2: end_turn com texto final
      .mockResolvedValueOnce({
        id: 'msg_2',
        role: 'assistant',
        model: 'claude-sonnet-4-5',
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: 'Encontrei 2 produtos: Caneta Bic Azul (B-001) e Caneta Pilot Preta (P-002).',
          },
        ],
      });
    const anthropic = { messages: { create: anthropicCreate } } as never;

    // ----- ToolsRegistry com search_products -----
    const tools = new ToolsRegistry([createSearchProductsTool(prisma as never)]);

    // ----- Service direto (sem Nest DI — instanciacao manual) -----
    const service = new AiChatService(anthropic, prisma as never, tools, {
      defaultModel: 'claude-sonnet-4-5',
      fallbackModel: 'claude-haiku-4-5',
    });
    void AI_CHAT_OPTIONS_TOKEN; // silenciar tree-shake noise

    // ----- Run dentro do TenantContext (simula MultiTenantInterceptor) -----
    const result = await TenantContext.run({ session: makeSession(tenantId, userId) }, () =>
      service.chat({ messages: [{ role: 'user', content: 'liste canetas' }] }, userId),
    );

    // ----- Assertions -----
    expect(anthropicCreate).toHaveBeenCalledTimes(2);
    expect(findManySpy).toHaveBeenCalledTimes(1);
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          name: expect.objectContaining({ contains: 'caneta' }),
        }),
      }),
    );
    expect(result.conversationId).toBe('conv_1');
    expect(result.message.role).toBe('assistant');
    expect(result.message.content).toContain('Encontrei 2 produtos');

    // Persistencia: user msg + assistant msg na mesma conversation
    const persisted = state.messages.filter((m) => m.conversationId === 'conv_1');
    expect(persisted.length).toBeGreaterThanOrEqual(2);
    const roles = persisted.map((m) => m.role);
    expect(roles).toContain('user');
    expect(roles).toContain('assistant');
  });

  it('lanca apos MAX_TOOL_ITERATIONS sem convergir', async () => {
    const tenantId = 'tenant-1';
    const userId = 'user-1';
    const state: MockPrismaState = { conversations: [], messages: [], products: [] };
    const prisma = createMockPrisma(
      state,
      jest.fn(async () => []),
    );

    // Anthropic sempre devolve tool_use → loop nao converge
    const anthropicCreate = jest.fn().mockResolvedValue({
      id: 'msg',
      role: 'assistant',
      model: 'claude-sonnet-4-5',
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_loop',
          name: 'search_products',
          input: { query: 'x', limit: 1 },
        },
      ],
    });
    const anthropic = { messages: { create: anthropicCreate } } as never;

    const tools = new ToolsRegistry([createSearchProductsTool(prisma as never)]);
    const service = new AiChatService(anthropic, prisma as never, tools, {
      defaultModel: 'claude-sonnet-4-5',
      fallbackModel: 'claude-haiku-4-5',
    });

    await expect(
      TenantContext.run({ session: makeSession(tenantId, userId) }, () =>
        service.chat({ messages: [{ role: 'user', content: 'spam' }] }, userId),
      ),
    ).rejects.toThrow(/did not converge/i);

    // Hard cap = 5
    expect(anthropicCreate).toHaveBeenCalledTimes(5);
  });
});
