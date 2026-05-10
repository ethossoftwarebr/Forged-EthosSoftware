import type { AuthRole, AuthSession } from '@ethos/auth';
import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_METADATA_KEY } from '../decorators/roles.decorator';

/**
 * Hierarquia de roles — owner é o mais alto, viewer o mais baixo.
 * Default deny: endpoint sem `@Roles()` aceita QUALQUER role autenticado.
 */
const ROLE_HIERARCHY: Record<AuthRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  viewer: 1,
};

/**
 * RolesGuard — verifica se o user tem AO MENOS UM dos roles listados em
 * `@Roles(...)`. Roles são comparados via hierarquia: ter `admin` satisfaz
 * `@Roles('manager')` automaticamente.
 *
 * Aplicar APÓS o JwtAuthGuard (que popula request.user). Geralmente é
 * controller-scoped via `@UseGuards(RolesGuard)`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AuthRole[]>(ROLES_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthSession }>();
    const userRoles = request.user?.roles ?? [];
    if (userRoles.length === 0) {
      throw new ForbiddenException('Usuário sem roles atribuídos.');
    }

    const userMaxLevel = Math.max(...userRoles.map((r) => ROLE_HIERARCHY[r] ?? 0));
    const requiredMinLevel = Math.min(...required.map((r) => ROLE_HIERARCHY[r] ?? 999));

    if (userMaxLevel < requiredMinLevel) {
      throw new ForbiddenException(`Requer ao menos role ${required.join(' ou ')}.`);
    }

    return true;
  }
}
