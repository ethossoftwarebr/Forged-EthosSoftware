import prismaInternals from '@prisma/internals';
import { readFile } from 'node:fs/promises';

const { getDMMF } = prismaInternals;

/**
 * Lê schema.prisma e retorna lista de models marcados com /// @forge.generate(...)
 * @param {string} schemaPath - path absoluto do schema.prisma
 * @returns {Promise<Array<{model: object, generates: string[]}>>}
 */
export async function parseMarkedModels(schemaPath) {
  const schemaContent = await readFile(schemaPath, 'utf8');
  const dmmf = await getDMMF({ datamodel: schemaContent });

  const marked = [];
  for (const model of dmmf.datamodel.models) {
    const generates = extractForgeGenerates(model.documentation);
    if (generates.length > 0) {
      marked.push({ model, generates });
    }
  }
  return marked;
}

/**
 * Parse "@forge.generate(controller, page)" → ["controller", "page"]
 * Retorna [] se marker ausente.
 */
function extractForgeGenerates(documentation) {
  if (!documentation) return [];
  const match = documentation.match(/@forge\.generate\s*\(([^)]+)\)/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Valida que model tem campo `tenantId` (D7 — strict mode).
 * Lança erro com mensagem clara se faltar.
 */
export function assertTenantId(model) {
  const hasTenantId = model.fields.some((f) => f.name === 'tenantId' && f.type === 'String');
  if (!hasTenantId) {
    throw new Error(
      `Model "${model.name}" está marcado com /// @forge.generate mas não tem campo \`tenantId: String\`. ` +
        `Multi-tenant é mandatory no Forge — adicione tenantId ao model antes de gerar.`,
    );
  }
}
