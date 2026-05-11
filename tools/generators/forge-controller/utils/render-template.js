import Handlebars from 'handlebars';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { constants } from 'node:fs';
import { toKebabCase, toPascalCase, toCamelCase, pluralize } from './case-helpers.js';

// Helpers Handlebars — disponíveis pra transformações ad-hoc no template.
// Nota: `resourcePath` NÃO é registrado como helper porque o contexto já expõe
// `{{resourcePath}}` como variável (colisão de nome). Use `{{kebab name}}` +
// `{{plural ...}}` se precisar derivar paths manualmente.
Handlebars.registerHelper('kebab', (s) => toKebabCase(s));
Handlebars.registerHelper('pascal', (s) => toPascalCase(s));
Handlebars.registerHelper('camel', (s) => toCamelCase(s));
Handlebars.registerHelper('plural', (s) => pluralize(s));

/**
 * Renderiza template Handlebars e escreve em outputPath.
 * @param {string} templatePath - .hbs path
 * @param {string} outputPath - destino .ts
 * @param {object} context - dados pro template
 * @param {object} options - { skipIfExists: boolean }
 * @returns {Promise<'written' | 'skipped'>}
 */
export async function renderToFile(templatePath, outputPath, context, options = {}) {
  if (options.skipIfExists && (await fileExists(outputPath))) {
    return 'skipped';
  }
  const templateSource = await readFile(templatePath, 'utf8');
  const compiled = Handlebars.compile(templateSource, { noEscape: true });
  const rendered = compiled(context);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, rendered, 'utf8');
  return 'written';
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
