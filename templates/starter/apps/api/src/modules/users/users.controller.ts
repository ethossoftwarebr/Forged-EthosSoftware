import { CurrentUser, Roles } from '@ethos/api-base';
import type { AuthSession } from '@ethos/auth';
import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ZodBody } from '../../common/pipes/zod-validation.pipe';

import { UpdateMeSchema, type UpdateMeDto } from './dto/update-me.dto';
import { type ListUsersResult, type PublicUserWithRoles, UsersService } from './users.service';

/**
 * UsersController — endpoints user-facing do UsersModule.
 *
 * Todos privados por default (JwtAuthGuard global). Mutações restringem
 * privilégio via `@Roles(...)` (RolesGuard, princípio do menor privilégio).
 *
 * Princípios travados (CLAUDE.md / spec #8):
 *  - tenantId NUNCA do body/query — sempre `session.tenantId` do JWT (AC #9)
 *  - cross-tenant 404 em GET /users/:id (AC #5)
 *  - sanitização: password/totpSecret/lockedUntil/failedLoginAttempts never out
 */
@ApiTags('users')
@Controller('users')
export class UsersController {
  // Limites de paginação alinhados com defaults web/mobile + proteção contra abuse.
  private readonly MAX_TAKE = 100;
  private readonly MAX_SKIP = 100_000;

  constructor(private readonly usersService: UsersService) {}

  // ==========================================================================
  // GET /users — listing (admin/manager/owner)
  // ==========================================================================

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin', 'manager')
  async list(
    @CurrentUser() session: AuthSession,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) takeRaw: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skipRaw: number,
    @Query('search') search?: string,
  ): Promise<ListUsersResult> {
    if (takeRaw < 1 || takeRaw > this.MAX_TAKE) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `take deve estar entre 1 e ${this.MAX_TAKE}.`,
      });
    }
    if (skipRaw < 0 || skipRaw > this.MAX_SKIP) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `skip deve estar entre 0 e ${this.MAX_SKIP}.`,
      });
    }

    return this.usersService.listInTenant(session.tenantId, {
      take: takeRaw,
      skip: skipRaw,
      ...(search ? { search } : {}),
    });
  }

  // ==========================================================================
  // GET /users/me — qualquer role autenticado
  // ==========================================================================

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() session: AuthSession): Promise<PublicUserWithRoles> {
    return this.usersService.getMe(session.userId, session.tenantId);
  }

  // ==========================================================================
  // PATCH /users/me — qualquer role autenticado; DTO strict rejeita tenantId
  // ==========================================================================

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @CurrentUser() session: AuthSession,
    @ZodBody(UpdateMeSchema) dto: UpdateMeDto,
  ): Promise<PublicUserWithRoles> {
    // session.tenantId vem do JWT decodificado — NUNCA do body (AC #9).
    return this.usersService.updateMe(session.userId, session.tenantId, dto);
  }

  // ==========================================================================
  // GET /users/:id — admin/manager/owner; AC #5 cross-tenant 404
  // ==========================================================================

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin', 'manager')
  async findOne(
    @CurrentUser() session: AuthSession,
    @Param('id') id: string,
  ): Promise<PublicUserWithRoles> {
    // findInTenant filtra por TenantMember.tenantId === session.tenantId.
    // Se user existe globalmente mas não nesse tenant → 404 (D6, AC #5).
    return this.usersService.findInTenant(session.tenantId, id);
  }
}
