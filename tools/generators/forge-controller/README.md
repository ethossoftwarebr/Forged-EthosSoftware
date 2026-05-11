# @ethos-tools/forge-controller

CLI Forge — gera controllers/modules/services/repositories NestJS a partir do schema Prisma marcado com `/// @forge.generate(controller)`.

## IP da Ethos

Não é publicado, não é distribuído com o starter. Cliente recebe o output (`templates/starter/apps/api/src/modules/<resource>/`), não a CLI.

## Como rodar

```bash
# Listar models marcados (dry run)
node tools/generators/forge-controller/index.js --dry

# Gerar arquivos
node tools/generators/forge-controller/index.js
```

## Modelo B (D3)

Re-rodar CLI **sempre sobrescreve**: `controller.ts`, `module.ts`, `repository.ts`.
Re-rodar CLI **NUNCA sobrescreve** `service.ts` se já existir — esse é o ponto de extensão pra lógica de negócio customizada do dev.

## Multi-tenant (D7)

Model marcado **DEVE** ter campo `tenantId: String`. Senão, CLI aborta.

## Marker syntax (D1)

```prisma
/// @forge.generate(controller)         — só backend
/// @forge.generate(controller, page)   — backend + frontend (page vem no #11)
```
