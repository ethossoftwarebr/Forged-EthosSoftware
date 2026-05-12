#!/usr/bin/env node
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import mri from 'mri';
import pc from 'picocolors';
import {
  parseMarkedModels,
  getIdField,
  enrichFields,
  pickLabelField,
} from './utils/parse-schema.js';
import { renderToFile, renderToString } from './utils/render-template.js';
import {
  resourcePath,
  toCamelCase,
  toPascalCase,
  toKebabCase,
  pluralize,
  pluralPascal,
} from './utils/case-helpers.js';
import { resolveIcon } from './icon-map.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths fixos relativos ao root do monorepo (tools/generators/forge-page/ → ../../..)
const REPO_ROOT = resolve(__dirname, '../../..');
const SCHEMA_PATH = resolve(REPO_ROOT, 'packages/database/prisma/schema.prisma');
const WEB_APP_ROOT = resolve(REPO_ROOT, 'templates/starter/apps/web');
const PAGES_DIR = resolve(WEB_APP_ROOT, 'src/app/(dashboard)');
const SIDEBAR_PATH = resolve(WEB_APP_ROOT, 'src/config/sidebar.tsx');
const TEMPLATES_DIR = resolve(__dirname, 'templates');

// D6 — markers da sidebar (regex case-sensitive, com whitespace tolerável nas pontas)
const SIDEBAR_MARKER_REGEX = /^\s*\/\/\s*FORGE-AUTOGEN:(START|END)\s*$/m;
const SIDEBAR_START_LINE = '  // FORGE-AUTOGEN:START';
const SIDEBAR_END_LINE = '  // FORGE-AUTOGEN:END';

/**
 * Plano de renderização: 1 template `.hbs` → 1 arquivo de saída por model.
 * Todos passam por `renderToFile` que aplica D3 (Modelo B — header AUTOGEN +
 * preservação se dev removeu o header).
 *
 * `outPath` é relativo a `PAGES_DIR/{slug}` (ex: `_components/Columns.tsx`).
 */
const RENDER_PLAN = [
  // Components (preservados via D3)
  { template: 'columns.hbs', outPath: () => '_components/Columns.tsx' },
  { template: 'form-fields.hbs', outPath: () => '_components/FormFields.tsx' },
  // Pages
  { template: 'list.hbs', outPath: () => 'page.tsx' },
  { template: 'create.hbs', outPath: () => 'new/page.tsx' },
  { template: 'view.hbs', outPath: () => '[id]/page.tsx' },
  { template: 'edit.hbs', outPath: () => '[id]/edit/page.tsx' },
];

async function main() {
  const args = mri(process.argv.slice(2), {
    boolean: ['dry-run', 'help'],
    alias: { h: 'help', d: 'dry-run' },
  });

  if (args.help) {
    printHelp();
    return;
  }

  console.log(pc.cyan(`→ Lendo schema: ${SCHEMA_PATH}`));
  const { marked, enums } = await parseMarkedModels(SCHEMA_PATH);

  console.log(pc.green(`✓ Found ${marked.length} model(s) marcado(s) com 'page':`));
  for (const { model, iconOverride } of marked) {
    const iconNote = iconOverride ? pc.dim(` (icon override: ${iconOverride})`) : '';
    console.log(`  • ${pc.bold(model.name)}${iconNote}`);
  }

  if (marked.length === 0) {
    console.log(pc.yellow('Nenhum model marcado com /// @forge.generate(page) — nada a fazer.'));
    return;
  }

  if (args['dry-run']) {
    console.log(pc.yellow('\n[dry-run] Nenhum arquivo será escrito.'));
    // Mesmo em dry-run, mostra o que seria gerado.
  }

  // Build context per model + render por-arquivo
  const contexts = marked.map(({ model, iconOverride }) =>
    buildContext(model, iconOverride, enums),
  );

  let written = 0;
  let skippedCustomized = 0;
  let wouldWrite = 0;

  for (const ctx of contexts) {
    for (const target of RENDER_PLAN) {
      const outPath = resolve(PAGES_DIR, ctx.resourcePath, target.outPath(ctx));
      const result = await renderToFile(resolve(TEMPLATES_DIR, target.template), outPath, ctx, {
        dryRun: !!args['dry-run'],
      });
      logResult(result, outPath);
      if (result === 'written') written++;
      else if (result === 'skipped-customized') skippedCustomized++;
      else if (result === 'would-write') wouldWrite++;
    }
  }

  // Sidebar — atualiza bloco entre markers + injeta imports Lucide
  const sidebarResult = await updateSidebar(contexts, { dryRun: !!args['dry-run'] });
  logResult(sidebarResult, SIDEBAR_PATH);
  if (sidebarResult === 'written') written++;
  else if (sidebarResult === 'skipped-customized') skippedCustomized++;
  else if (sidebarResult === 'would-write') wouldWrite++;

  // Resumo
  const summaryParts = [];
  if (written) summaryParts.push(pc.green(`${written} written`));
  if (wouldWrite) summaryParts.push(pc.yellow(`${wouldWrite} would-write (dry)`));
  if (skippedCustomized) summaryParts.push(pc.yellow(`${skippedCustomized} skipped (customized)`));
  console.log(
    pc.bold(
      `\n[forge-page] ${summaryParts.join(', ') || 'nothing to do'} for ${contexts.length} model(s).`,
    ),
  );
}

function buildContext(model, iconOverride, enums = []) {
  const name = model.name; // Product
  const fields = enrichFields(model, enums); // [{name, label, formFieldType, ...}, ...]
  const idField = getIdField(model);
  const labelField = pickLabelField(fields, idField);

  // Operation IDs gerados pelo NestJS Swagger seguem o padrão
  // `{ControllerName}_{methodName}`, que o hey-api normaliza pra camelCase.
  // Os controllers atuais do Forge expõem 5 métodos: list, findOne, create, update, remove.
  // Plugins:
  //  - `@tanstack/react-query` → naming `{{name}}Options` (query) / `{{name}}Mutation` (mutation)
  //  - `zod` → schemas com prefixo `z` + sufixo `Body`/`Data`/`Response` (request bodies → `z{Name}Body`)
  // W4 fix: usa `pluralize()` pra cobrir `Category → categoriesController`
  // (antes saía `categorysController` com concat de `s` cru). Mantém alinhamento
  // com o nome real da classe NestJS — qualquer override fica via /// @forge.controller()
  // em V2 (não temos hoje).
  const controllerBase = `${pluralize(toCamelCase(name))}Controller`; // productsController | categoriesController

  return {
    modelName: name,
    Model: name, // alias pro template (PascalCase)
    model: toCamelCase(name), // product
    className: toPascalCase(name), // Product
    varName: toCamelCase(name), // product
    resourcePath: resourcePath(name), // products (kebab plural — usado em path/route)
    resourceKebab: toKebabCase(name), // product (kebab singular)
    pluralKebab: pluralize(toKebabCase(name)), // products
    slug: resourcePath(name), // alias pro template sidebar
    label: pluralPascal(name), // Products (label da sidebar)
    ModelPlural: pluralPascal(name), // Products (header/título)
    controllerBase, // productsController — usado em invalidateQueries({predicate})
    icon: resolveIcon(name, iconOverride),
    iconOverride,
    idField: idField?.name ?? 'id',
    idIsNumeric: ['Int', 'BigInt'].includes(idField?.type ?? 'String'),
    labelField,
    // Operations geradas pelo plugin @tanstack/react-query do hey-api.
    listOptions: `${controllerBase}ListOptions`,
    findOneOptions: `${controllerBase}FindOneOptions`,
    findOneQueryKey: `${controllerBase}FindOneQueryKey`,
    createMutation: `${controllerBase}CreateMutation`,
    updateMutation: `${controllerBase}UpdateMutation`,
    removeMutation: `${controllerBase}RemoveMutation`,
    listQueryKey: `${controllerBase}ListQueryKey`,
    // Zod request body schemas geradas pelo plugin `zod` do hey-api.
    createBodySchema: `z${toPascalCase(controllerBase)}CreateBody`,
    updateBodySchema: `z${toPascalCase(controllerBase)}UpdateBody`,
    // Columns (compat com columns.hbs do W2 — mantém shape antigo)
    columns: fields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.prismaType,
      isRequired: f.isRequired,
      isList: f.isList,
      kind: f.kind,
      isDate: f.isDate,
      isNumber: f.isNumber,
      isBoolean: f.isBoolean,
    })),
    // Fields enriquecidos pros templates W3 (form-fields.hbs, view.hbs, etc).
    fields,
  };
}

/**
 * D6 — atualiza sidebar.tsx:
 *   1. Substitui conteúdo entre os 2 markers AUTOGEN
 *   2. Garante que os ícones Lucide referenciados estão importados no top
 *
 * Falha com erro claro se 1 dos markers estiver ausente.
 *
 * D3 ALSO aplica aqui: se sidebar.tsx existe e primeira linha NÃO começa com
 * `// FORGE-AUTOGEN:` E nenhum marker foi encontrado, retorna skipped-customized.
 * Mas como sidebar.tsx tem partes manuais (Dashboard/Settings) fora dos markers,
 * a regra é diferente: a presença dos markers É o opt-in pra regen — sem markers,
 * skip silencioso com warning.
 */
async function updateSidebar(contexts, options = {}) {
  if (!(await fileExists(SIDEBAR_PATH))) {
    throw new Error(
      `Sidebar não encontrada em ${SIDEBAR_PATH}. Crie o arquivo com os markers ` +
        `FORGE-AUTOGEN:START / FORGE-AUTOGEN:END antes de rodar o gen.`,
    );
  }

  const source = await readFile(SIDEBAR_PATH, 'utf8');
  const lines = source.split(/\r?\n/);

  // Localiza markers (linha exata)
  const startIdx = lines.findIndex((l) => /^\s*\/\/\s*FORGE-AUTOGEN:START\s*$/.test(l));
  const endIdx = lines.findIndex((l) => /^\s*\/\/\s*FORGE-AUTOGEN:END\s*$/.test(l));

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error(
      `Sidebar ${SIDEBAR_PATH} não contém os markers obrigatórios FORGE-AUTOGEN:START / FORGE-AUTOGEN:END (D6). ` +
        `Re-crie o arquivo a partir do template inicial em templates/starter/apps/web/src/config/sidebar.tsx.`,
    );
  }

  // Renderiza entries (1 por model)
  const entryParts = [];
  for (const ctx of contexts) {
    const rendered = await renderToString(resolve(TEMPLATES_DIR, 'sidebar-entry.hbs'), ctx);
    // remove trailing newline pra controle exato
    entryParts.push(rendered.replace(/\r?\n$/, ''));
  }

  // Monta novo bloco
  const newBlock = [
    lines[startIdx], // preserva indentação original do marker START
    ...entryParts,
    lines[endIdx], // preserva indentação original do marker END
  ];

  // Atualiza imports lucide-react (linha existente OU cria nova)
  const iconsNeeded = new Set(contexts.map((c) => c.icon));
  const updatedLines = updateLucideImports(
    [...lines.slice(0, startIdx), ...newBlock, ...lines.slice(endIdx + 1)],
    iconsNeeded,
  );

  const newContent = updatedLines.join('\n');

  // Idempotência: se conteúdo igual, não escreve
  if (newContent === source) {
    return options.dryRun ? 'would-write' : 'unchanged';
  }

  if (options.dryRun) return 'would-write';

  await writeFile(SIDEBAR_PATH, newContent, 'utf8');
  return 'written';
}

/**
 * Garante que `import { ... } from 'lucide-react'` contém todos os ícones necessários.
 * Preserva ícones existentes (Dashboard, Settings, etc.) + adiciona os que faltam.
 * Não toca em outros imports do arquivo.
 */
function updateLucideImports(lines, iconsNeeded) {
  const importRegex = /^import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]lucide-react['"]\s*;?\s*$/;
  const importIdx = lines.findIndex((l) => importRegex.test(l));

  if (importIdx === -1) {
    // Cria import no topo (após imports existentes; aqui simplesmente injeta após linha 0 ou no topo)
    const merged = `import { ${[...iconsNeeded].sort().join(', ')} } from 'lucide-react';`;
    // Insere após a primeira linha de import OU no topo
    const firstImport = lines.findIndex((l) => /^import\s+/.test(l));
    const insertAt = firstImport === -1 ? 0 : firstImport + 1;
    return [...lines.slice(0, insertAt), merged, ...lines.slice(insertAt)];
  }

  const match = lines[importIdx].match(importRegex);
  const existing = new Set(
    match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  for (const ico of iconsNeeded) existing.add(ico);
  const sorted = [...existing].sort();
  const newImport = `import { ${sorted.join(', ')} } from 'lucide-react';`;

  const out = [...lines];
  out[importIdx] = newImport;
  return out;
}

function logResult(result, path) {
  const rel = path.replace(REPO_ROOT, '.');
  if (result === 'written') console.log(pc.green(`  + ${pc.dim(rel)}`));
  else if (result === 'would-write') console.log(pc.yellow(`  ? ${pc.dim(rel)} (dry-run)`));
  else if (result === 'skipped-customized')
    console.log(
      pc.yellow(`  ~ skip ${pc.dim(rel)} (customized — primeira linha sem AUTOGEN header)`),
    );
  else if (result === 'unchanged') console.log(pc.dim(`  = ${rel} (unchanged)`));
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function printHelp() {
  console.log(`
${pc.bold('forge-page')} — gera 4 páginas Next.js (list/create/view/edit) + sidebar entry a partir do schema Prisma marcado.

${pc.bold('Usage:')}
  node tools/generators/forge-page/index.js [--dry-run]

${pc.bold('Flags:')}
  --dry-run, -d   Lista o que seria gerado, sem escrever arquivos
  --help, -h      Mostra esta mensagem

${pc.bold('Marker no schema.prisma:')}
  /// @forge.generate(page)               — gera só frontend
  /// @forge.generate(controller, page)   — backend (forge-controller) + frontend
  /// @forge.icon(Package)                — override do ícone (default: icon-map heurística)

${pc.bold('Modelo B (preservação):')}
  Todo arquivo gerado começa com:
    // FORGE-AUTOGEN: this file is regenerated unless you delete this comment
  Remova essa linha pra travar o arquivo — o CLI pula com aviso.

${pc.bold('Sidebar (D6):')}
  Atualiza o bloco entre os markers FORGE-AUTOGEN:START / FORGE-AUTOGEN:END
  em templates/starter/apps/web/src/config/sidebar.tsx. Items fora dos markers
  são preservados.
`);
}

main().catch((err) => {
  console.error(pc.red(`✖ [forge-page] ${err.message}`));
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
