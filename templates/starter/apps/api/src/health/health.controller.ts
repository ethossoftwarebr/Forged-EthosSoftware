import { Controller, Get } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

/**
 * Health endpoint exposto em GET /health.
 *
 * Checks ativos:
 * - memory_heap: heap usado < 200 MB (alinha com defaults Forge; ajustar via env quando #8 trouxer EnvService aqui)
 * - disk: uso < 90% do volume raiz (cross-platform: C:\ no Windows, / em Unix)
 *
 * Notas:
 * - PrismaHealthIndicator será habilitado no prompt #8, quando @ethos/database existir
 *   e expor um PrismaService injetável. Por ora, ficam só os checks de runtime.
 * - Sem `@Public()` aqui — esse decorator só passa a existir após o #8 (auth global guard).
 *   Enquanto não há JwtAuthGuard global, a rota é acessível por padrão.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),
      // PrismaHealthIndicator — habilitado em #8 quando @ethos/database existir.
    ]);
  }
}
