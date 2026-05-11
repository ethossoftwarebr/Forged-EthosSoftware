import { Module } from '@nestjs/common';

import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

/**
 * ProductsModule — gerado pelo Forge (prompt #9).
 *
 * `PRISMA_CLIENT_TOKEN` é provido globalmente pelo `AuthModule` (@Global) —
 * não precisa declarar aqui.
 */
@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
})
export class ProductsModule {}
