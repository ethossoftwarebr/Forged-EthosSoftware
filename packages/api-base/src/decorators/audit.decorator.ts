import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'ethos:audit';

export interface AuditMetadata {
  action: string;
  resourceType?: string;
}

/**
 * `@Audit(action, resourceType?)` — anota endpoint pra ser registrado no
 * AuditLog pelo `AuditLogInterceptor`. Action segue convenção dot-namespaced:
 * `user.create`, `tenant.update`, `auth.login`, etc.
 *
 * D7 (#8): grava síncrono na mesma transaction. Refactor pra BullMQ async em #15.
 *
 * @example
 *   @Post()
 *   @Audit('user.create', 'User')
 *   create(@Body() dto: CreateUserDto) { ... }
 */
export const Audit = (action: string, resourceType?: string) =>
  SetMetadata(AUDIT_METADATA_KEY, { action, resourceType } as AuditMetadata);
