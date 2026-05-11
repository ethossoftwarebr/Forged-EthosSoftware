import { z } from 'zod';

/**
 * InviteDto — payload do POST /tenants/me/members/invite.
 *
 * Decisões travadas (spec #8 Wave 3):
 *  - role 'owner' fica explicitamente FORA do enum: owner é atribuído só no
 *    register (criador do tenant). Promoção pra owner vem em sprint dedicado.
 *  - email único (lowercase normalizado no service).
 *  - sem `tenantId` no body — sempre `session.tenantId` do JWT (AC #9).
 *  - `.strict()` rejeita keys extras.
 *
 * Envio de email transactional fica pro #8.6 (D14.7). Esta Wave só cria o
 * registro TenantMember + User stub se necessário.
 */
export const InviteSchema = z
  .object({
    email: z.string().email().max(254),
    role: z.enum(['admin', 'manager', 'member', 'viewer']),
  })
  .strict();

export type InviteDto = z.infer<typeof InviteSchema>;
