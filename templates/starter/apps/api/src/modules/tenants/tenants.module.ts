import { Module } from '@nestjs/common';

import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

/**
 * TenantsModule — tenant-self management + memberships.
 *
 * Não declara providers extras: `PRISMA_CLIENT_TOKEN` é injetado via `@Global()`
 * `AuthModule` (Wave 2). Guards globais (Jwt + Roles) já wired no AppModule.
 */
@Module({
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
