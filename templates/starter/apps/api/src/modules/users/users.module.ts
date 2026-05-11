import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * UsersModule — endpoints user-facing.
 *
 * Não declara providers extras: `PRISMA_CLIENT_TOKEN` é injetado via `@Global()`
 * `AuthModule` (Wave 2). `JwtAuthGuard` global protege todos os endpoints por
 * default (sem `@Public()`); `RolesGuard` global aplica `@Roles(...)` quando
 * presente. Sem `@Roles` = qualquer role autenticado passa.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
