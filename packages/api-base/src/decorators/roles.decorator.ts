import type { AuthRole } from '@ethos/auth';
import { SetMetadata } from '@nestjs/common';

export const ROLES_METADATA_KEY = 'ethos:roles';

/**
 * `@Roles(...)` — restringe o endpoint a roles específicos. Lido pelo
 * `RolesGuard`. Princípio do menor privilégio (CLAUDE.md): default é negado;
 * endpoints anotam explicitamente quais roles podem.
 *
 * Hierarquia: owner > admin > manager > member > viewer (config interna do guard).
 *
 * @example
 *   @Post()
 *   @Roles('owner', 'admin')
 *   create() { ... }
 */
export const Roles = (...roles: AuthRole[]) => SetMetadata(ROLES_METADATA_KEY, roles);
