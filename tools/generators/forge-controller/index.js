#!/usr/bin/env node
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mri from 'mri';
import pc from 'picocolors';
import { parseMarkedModels, assertTenantId } from './utils/parse-schema.js';
import { renderToFile } from './utils/render-template.js';
import { resourcePath, toCamelCase, toKebabCase, pluralize } from './utils/case-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths fixos relativos ao root do monorepo (tools/generators/forge-controller/ → ../../..)
const REPO_ROOT = resolve(__dirname, '../../..');
const SCHEMA_PATH = resolve(REPO_ROOT, 'packages/database/prisma/schema.prisma');
const API_MODULES_DIR = resolve(REPO_ROOT, 'templates/starter/apps/api/src/modules');
const TEMPLATES_DIR = resolve(__dirname, 'templates');

async function main() {
  const args = mri(process.argv.slice(2), {
    boolean: ['dry', 'help'],
    alias: { h: 'help', d: 'dry' },
  });

  if (args.help) {
    console.log(`
${pc.bold('forge-controller')} — gera controller/module/service/repository NestJS a partir do schema Prisma marcado.

${pc.bold('Usage:')}
  node tools/generators/forge-controller/index.js [--dry]

${pc.bold('Flags:')}
  --dry, -d    Apenas lista models que seriam gerados, sem escrever arquivos
  --help, -h   Mostra esta mensagem

${pc.bold('Marker:')}
  /// @forge.generate(controller)        — gera só backend
  /// @forge.generate(controller, page)  — gera backend + frontend (frontend vem no #11)
`);
    return;
  }

  console.log(pc.cyan(`→ Lendo schema: ${SCHEMA_PATH}`));
  const marked = await parseMarkedModels(SCHEMA_PATH);

  const withController = marked.filter((m) => m.generates.includes('controller'));
  console.log(pc.green(`✓ Found ${withController.length} model(s) marcado(s) com 'controller':`));
  for (const { model, generates } of withController) {
    console.log(`  • ${pc.bold(model.name)} [${generates.join(', ')}]`);
  }

  if (withController.length === 0) {
    console.log(pc.yellow('Nenhum model marcado — nada a fazer.'));
    return;
  }

  if (args.dry) {
    console.log(pc.yellow('\n[dry] Sem escrita. Use sem --dry pra gerar arquivos.'));
    return;
  }

  // Validação D7: cada model marcado DEVE ter tenantId
  for (const { model } of withController) {
    assertTenantId(model);
  }

  // Geração
  let written = 0;
  let skipped = 0;
  for (const { model } of withController) {
    const ctx = buildContext(model);
    const dir = resolve(API_MODULES_DIR, ctx.resourcePath);

    const targets = [
      { template: 'controller.hbs', output: `${ctx.resourcePath}.controller.ts`, force: true },
      { template: 'module.hbs', output: `${ctx.resourcePath}.module.ts`, force: true },
      { template: 'repository.hbs', output: `${ctx.resourcePath}.repository.ts`, force: true },
      { template: 'service.hbs', output: `${ctx.resourcePath}.service.ts`, force: false }, // D3: Modelo B
    ];

    for (const t of targets) {
      const templatePath = resolve(TEMPLATES_DIR, t.template);
      const outputPath = resolve(dir, t.output);
      const result = await renderToFile(templatePath, outputPath, ctx, {
        skipIfExists: !t.force,
      });
      if (result === 'written') {
        console.log(pc.green(`  + ${pc.dim(outputPath.replace(REPO_ROOT, '.'))}`));
        written++;
      } else {
        console.log(
          pc.yellow(
            `  ~ skip ${pc.dim(outputPath.replace(REPO_ROOT, '.'))} (já existe — Modelo B)`,
          ),
        );
        skipped++;
      }
    }
  }

  console.log(
    pc.bold(
      `\n${pc.green('✓')} Geração concluída: ${written} arquivo(s) escrito(s), ${skipped} skipped.`,
    ),
  );
}

function buildContext(model) {
  const name = model.name;
  return {
    modelName: name, // Product
    className: name, // Product
    varName: toCamelCase(name), // product
    resourcePath: resourcePath(name), // products
    resourceKebab: toKebabCase(name), // product
    pluralKebab: pluralize(toKebabCase(name)), // products
    fields: model.fields.filter((f) => !f.relationName), // sem relations no DTO base
  };
}

main().catch((err) => {
  console.error(pc.red(`✖ ${err.message}`));
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
