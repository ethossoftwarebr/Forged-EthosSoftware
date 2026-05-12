import { CurrentUser, Roles, Audit } from '@ethos/api-base';
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
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ZodBody } from '../../common/pipes/zod-validation.pipe';

import {
  CreateProductDtoClass,
  CreateProductSchema,
  type CreateProductDto,
  UpdateProductDtoClass,
  UpdateProductSchema,
  type UpdateProductDto,
  ProductEntity,
  PaginatedProductResponse,
} from './dto/product.dto';
import { type ProductItem, type ListProductResult, ProductsService } from './products.service';

/**
 * ProductsController — gerado pelo Forge (prompt #9 + #11.5).
 *
 * Modelo B (D3): controller.ts é regenerado a cada `forge:gen:backend`.
 * Para customizar lógica de negócio, edite `products.service.ts` (preservado).
 *
 * Multi-tenant: `tenantId` vem de `@CurrentUser session.tenantId` (JWT).
 * NUNCA do body/query (D7 + CLAUDE.md).
 *
 * Roles por verbo (D5):
 *  - GET (list/findOne): owner, admin, manager, member, viewer (todos autenticados)
 *  - POST/PATCH: owner, admin, manager
 *  - DELETE: owner, admin
 *
 * Audit em mutations (D6): @Audit em POST/PATCH/DELETE; GETs sem audit.
 *
 * OpenAPI (#11.5): `@ApiBody({ type: ...DtoClass })` + `@Api*Response({ type: Entity })`
 * em cada verbo — hey-api gera tipos e zod schemas a partir disso.
 */
@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly MAX_TAKE = 100;
  private readonly MAX_SKIP = 100_000;

  constructor(private readonly productsService: ProductsService) {}

  // ==========================================================================
  // GET /products — listing (todos autenticados — D5)
  // ==========================================================================

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin', 'manager', 'member', 'viewer')
  @ApiOkResponse({ type: PaginatedProductResponse })
  async list(
    @CurrentUser() session: AuthSession,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('search') search?: string,
  ): Promise<ListProductResult> {
    if (take < 1 || take > this.MAX_TAKE) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `take deve estar entre 1 e ${this.MAX_TAKE}.`,
      });
    }
    if (skip < 0 || skip > this.MAX_SKIP) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `skip deve estar entre 0 e ${this.MAX_SKIP}.`,
      });
    }
    return this.productsService.list(session.tenantId, {
      take,
      skip,
      ...(search ? { search } : {}),
    });
  }

  // ==========================================================================
  // GET /products/:id — todos autenticados (D5); cross-tenant 404
  // ==========================================================================

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin', 'manager', 'member', 'viewer')
  @ApiOkResponse({ type: ProductEntity })
  async findOne(
    @CurrentUser() session: AuthSession,
    @Param('id') id: string,
  ): Promise<ProductItem> {
    return this.productsService.findOne(session.tenantId, id);
  }

  // ==========================================================================
  // POST /products — manager+ (D5); audit (D6)
  // ==========================================================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'admin', 'manager')
  @Audit('product.create')
  @ApiBody({ type: CreateProductDtoClass })
  @ApiCreatedResponse({ type: ProductEntity })
  async create(
    @CurrentUser() session: AuthSession,
    @ZodBody(CreateProductSchema) dto: CreateProductDto,
  ): Promise<ProductItem> {
    return this.productsService.create(session.tenantId, dto);
  }

  // ==========================================================================
  // PATCH /products/:id — manager+ (D5); audit (D6)
  // ==========================================================================

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin', 'manager')
  @Audit('product.update')
  @ApiBody({ type: UpdateProductDtoClass })
  @ApiOkResponse({ type: ProductEntity })
  async update(
    @CurrentUser() session: AuthSession,
    @Param('id') id: string,
    @ZodBody(UpdateProductSchema) dto: UpdateProductDto,
  ): Promise<ProductItem> {
    return this.productsService.update(session.tenantId, id, dto);
  }

  // ==========================================================================
  // DELETE /products/:id — admin+ (D5); audit (D6)
  // ==========================================================================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('owner', 'admin')
  @Audit('product.delete')
  @ApiNoContentResponse()
  async remove(@CurrentUser() session: AuthSession, @Param('id') id: string): Promise<void> {
    await this.productsService.remove(session.tenantId, id);
  }
}
