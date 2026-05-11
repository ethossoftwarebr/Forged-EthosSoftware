import { CurrentUser, Roles } from '@ethos/api-base';
import type { AuthSession } from '@ethos/auth';
import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ZodBody } from '../../common/pipes/zod-validation.pipe';

import { InviteSchema, type InviteDto } from './dto/invite.dto';
import { UpdateTenantSchema, type UpdateTenantDto } from './dto/update-tenant.dto';
import {
  type InviteResult,
  type ListMembersResult,
  type PublicTenant,
  TenantsService,
} from './tenants.service';

/**
 * TenantsController — endpoints do TenantsModule.
 *
 * Todos privados por default (JwtAuthGuard global). Mutações restringem
 * privilégio via `@Roles(...)` (princípio do menor privilégio).
 *
 * AC #9: tenantId NUNCA vem do path/body — sempre `session.tenantId` do JWT
 * decodificado. Path é `/tenants/me` (singular, sem id) pra reforçar isso.
 */
@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  private readonly MAX_TAKE = 100;
  private readonly MAX_SKIP = 100_000;

  constructor(private readonly tenantsService: TenantsService) {}

  // ==========================================================================
  // GET /tenants/me — qualquer role autenticado
  // ==========================================================================

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() session: AuthSession): Promise<PublicTenant> {
    return this.tenantsService.getMe(session.tenantId);
  }

  // ==========================================================================
  // PATCH /tenants/me — apenas owner/admin
  // ==========================================================================

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin')
  async updateMe(
    @CurrentUser() session: AuthSession,
    @ZodBody(UpdateTenantSchema) dto: UpdateTenantDto,
  ): Promise<PublicTenant> {
    return this.tenantsService.updateMe(session.tenantId, dto);
  }

  // ==========================================================================
  // GET /tenants/me/members — owner/admin/manager
  // ==========================================================================

  @Get('me/members')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin', 'manager')
  async listMembers(
    @CurrentUser() session: AuthSession,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) takeRaw: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skipRaw: number,
  ): Promise<ListMembersResult> {
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

    return this.tenantsService.listMembers(session.tenantId, {
      take: takeRaw,
      skip: skipRaw,
    });
  }

  // ==========================================================================
  // POST /tenants/me/members/invite — owner/admin
  // ==========================================================================

  @Post('me/members/invite')
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'admin')
  async invite(
    @CurrentUser() session: AuthSession,
    @ZodBody(InviteSchema) dto: InviteDto,
  ): Promise<InviteResult> {
    // session.tenantId do JWT; invitedBy = quem está chamando (audit trail).
    return this.tenantsService.inviteMember(session.tenantId, session.userId, dto);
  }

  // ==========================================================================
  // DELETE /tenants/me/members/:userId — owner/admin; LAST_OWNER protected
  // ==========================================================================

  @Delete('me/members/:userId')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin')
  async removeMember(
    @CurrentUser() session: AuthSession,
    @Param('userId') userId: string,
  ): Promise<{ removed: true }> {
    return this.tenantsService.removeMember(session.tenantId, userId);
  }
}
