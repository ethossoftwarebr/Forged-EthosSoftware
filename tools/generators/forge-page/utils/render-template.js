import Handlebars from 'handlebars';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { constants } from 'node:fs';
import { toKebabCase, toPascalCase, toCamelCase, pluralize } from './case-helpers.js';

// D3 — header AUTOGEN. Linha exata travada pela spec.
export const AUTOGEN_HEADER =
  '// FORGE-AUTOGEN: this file is regenerated unless you delete this comment';

// Helpers Handlebars — ad-hoc no template.
Handlebars.registerHelper('kebab', (s) => toKebabCase(s));
Handlebars.registerHelper('pascal', (s) => toPascalCase(s));
Handlebars.registerHelper('camel', (s) => toCamelCase(s));
Handlebars.registerHelper('plural', (s) => pluralize(s));

// JSX em hbs: JSX usa `{` em `={` (prop expr) e `{` em `{ ... }` (object literal),
// resultando em `={{` quando se passa objeto. Como Handlebars trata `{{` como
// abertura de tag, precisamos de helpers que emitam `{` e `}` literais
// dentro dos templates pra contornar isso.
Handlebars.registerHelper('open', () => '{');
Handlebars.registerHelper('close', () => '}');
// JSX prop com objeto literal: `prop={{ ... }}` — abre/fecha 2 chaves seguidas
// que conflitam com Handlebars (`{{` abre tag, `}}}` fecha triple-stache).
// Use `{{jsxObjOpen}}` no abre e `{{jsxObjClose}}` no fecha.
Handlebars.registerHelper('jsxObjOpen', () => '{{');
Handlebars.registerHelper('jsxObjClose', () => '}}');

/**
 * Renderiza template Handlebars. Aplica D3 (Modelo B):
 *   - Sempre prepende AUTOGEN_HEADER (a menos que o template já comece com ele)
 *   - Se outputPath existe E primeira linha NÃO é AUTOGEN_HEADER → 'skipped-customized'
 *   - Se outputPath não existe ou tem o header → 'written'
 *
 * @param {string} templatePath - .hbs path
 * @param {string} outputPath - destino .tsx
 * @param {object} context - dados pro template
 * @param {object} options - { dryRun: boolean }
 * @returns {Promise<'written' | 'skipped-customized' | 'would-write'>}
 */
export async function renderToFile(templatePath, outputPath, context, options = {}) {
  // Verifica customização do dev (D3)
  if (await fileExists(outputPath)) {
    const existing = await readFile(outputPath, 'utf8');
    const firstLine = existing.split(/\r?\n/, 1)[0] ?? '';
    if (!firstLine.startsWith('// FORGE-AUTOGEN:')) {
      return 'skipped-customized';
    }
  }

  const templateSource = await readFile(templatePath, 'utf8');
  const compiled = Handlebars.compile(templateSource, { noEscape: true });
  let rendered = compiled(context);

  // D3 — garante header AUTOGEN como primeira linha
  if (!rendered.startsWith('// FORGE-AUTOGEN:')) {
    rendered = `${AUTOGEN_HEADER}\n${rendered}`;
  }

  if (options.dryRun) {
    return 'would-write';
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, rendered, 'utf8');
  return 'written';
}

/**
 * Renderiza um template e devolve a string (sem escrever). Usado pra montar
 * o bloco da sidebar (1 linha por model) que será injetado entre markers.
 */
export async function renderToString(templatePath, context) {
  const templateSource = await readFile(templatePath, 'utf8');
  const compiled = Handlebars.compile(templateSource, { noEscape: true });
  return compiled(context);
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
