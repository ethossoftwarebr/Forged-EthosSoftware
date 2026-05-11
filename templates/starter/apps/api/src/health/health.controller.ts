import { PRISMA_CLIENT_TOKEN, Public } from '@ethos/api-base';
import type { PrismaClient } from '@ethos/database';
import { Controller, Get, Inject } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheck,
  type HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';

/**
 * Health endpoint exposto em GET /health.
 *
 * Checks ativos:
 * - memory_heap: heap usado < 200 MB
 * - disk: uso < 90% do volume raiz (cross-platform: C:\ no Windows, / em Unix)
 * - database: ping no Prisma via PrismaHealthIndicator (#8 — Concern #4 do #7)
 *
 * `@Public()` (Concern #4 do #7) — opt-out do JwtAuthGuard global registrado em
 * AppModule. Sem isso o endpoint /health retornaria 401 sem cookie, quebrando
 * orchestrators / load balancers que precisam pollar liveness.
 */
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly prismaHealth: PrismaHealthIndicator,
    @Inject(PRISMA_CLIENT_TOKEN) private readonly prisma: PrismaClient,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
