import prismaInternals from '@prisma/internals';
import { readFile } from 'node:fs/promises';

const { getDMMF } = prismaInternals;

/**
 * Lê schema.prisma e retorna lista de models marcados com /// @forge.generate(page)
 * (também aceita 'controller, page' combinado — filtra por inclusão de 'page').
 *
 * Retorna também os enums declarados no schema — necessário pra W3 derivar
 * `options` no FormBuilder pra campos enum.
 *
 * @param {string} schemaPath - path absoluto do schema.prisma
 * @returns {Promise<{ marked: Array<{model: object, generates: string[], iconOverride: string|null}>, enums: Array<object> }>}
 */
export async function parseMarkedModels(schemaPath) {
  const schemaContent = await readFile(schemaPath, 'utf8');
  const dmmf = await getDMMF({ datamodel: schemaContent });

  const marked = [];
  for (const model of dmmf.datamodel.models) {
    const generates = extractForgeGenerates(model.documentation);
    if (generates.includes('page')) {
      const iconOverride = extractIconOverride(model.documentation);
      marked.push({ model, generates, iconOverride });
    }
  }
  return { marked, enums: dmmf.datamodel.enums ?? [] };
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
 * Parse "@forge.icon(Package)" → "Package" (D4 override).
 * Retorna null se ausente.
 */
function extractIconOverride(documentation) {
  if (!documentation) return null;
  const match = documentation.match(/@forge\.icon\s*\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)/);
  return match ? match[1] : null;
}

/**
 * Filtra campos escalares do model, excluindo metadata/sistema:
 * - id, createdAt, updatedAt, tenantId
 * - relations (kind === 'object')
 * Retorna fields prontos pro template (com nome, tipo, isRequired, etc.)
 */
export function getScalarFields(model) {
  const EXCLUDED = new Set(['id', 'createdAt', 'updatedAt', 'tenantId']);
  return model.fields.filter(
    (f) => !EXCLUDED.has(f.name) && f.kind !== 'object' && !f.relationName,
  );
}

/**
 * Devolve o field id do model (geralmente `id`, mas captura overrides via `@id`).
 * Usado pelos templates view/edit pra construir routing `/{slug}/[id]`.
 */
export function getIdField(model) {
  return model.fields.find((f) => f.isId) ?? null;
}

/**
 * Mapeia o tipo Prisma → `FieldType` aceito pelo `@ethos/ui` FormBuilder.
 *   String   → text
 *   Int/Float/Decimal/BigInt → number
 *   Boolean  → checkbox
 *   DateTime → date
 *   enum     → select (options vêm do enum DMMF)
 *   Json/Bytes/relation → null (skipped)
 *
 * CONCERN W3: mapping simplificado — não cobre `@db.Text` → textarea (faltam
 * attributes na DMMF.field); `String` longo vira `text` sempre. Override
 * customizado via `/// @forge.field(<name>, textarea)` fica pra V2.
 */
export function mapPrismaToFormFieldType(prismaType, kind) {
  if (kind === 'enum') return 'select';
  switch (prismaType) {
    case 'String':
      return 'text';
    case 'Int':
    case 'Float':
    case 'Decimal':
    case 'BigInt':
      return 'number';
    case 'Boolean':
      return 'checkbox';
    case 'DateTime':
      return 'date';
    default:
      return null; // Json, Bytes, etc → skip
  }
}

/**
 * "createdBy" → "Created By"; "sku" → "Sku"; "name" → "Name".
 */
export function humanizeFieldName(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

/**
 * Enriquece os scalar fields com os atributos que os templates W3 precisam:
 *  - label (humanReadable)
 *  - formFieldType (mapeado D5 — null → skipped)
 *  - isOptional (negação de isRequired)
 *  - isDate / isNumber / isBoolean (helpers no template pra cell render)
 *  - enumValues (opcional — preenchido pelo caller via DMMF.enums)
 */
export function enrichFields(model, allEnums = []) {
  const enumByName = new Map(allEnums.map((e) => [e.name, e.values.map((v) => v.name)]));
  return getScalarFields(model)
    .map((f) => {
      const formFieldType = mapPrismaToFormFieldType(f.type, f.kind);
      if (!formFieldType) return null; // Json/Bytes — skip
      const enumValues = f.kind === 'enum' ? (enumByName.get(f.type) ?? []) : null;
      return {
        name: f.name,
        label: humanizeFieldName(f.name),
        prismaType: f.type,
        kind: f.kind,
        formFieldType,
        isRequired: f.isRequired,
        isOptional: !f.isRequired,
        isList: f.isList,
        isDate: f.type === 'DateTime',
        isNumber: ['Int', 'Float', 'Decimal', 'BigInt'].includes(f.type),
        isBoolean: f.type === 'Boolean',
        isString: f.type === 'String' && f.kind !== 'enum',
        enumValues,
      };
    })
    .filter(Boolean);
}

/**
 * Devolve a melhor "label field" pra mostrar como título nas páginas view/edit.
 * Heurística: primeiro field String não-id que case com `name|title|label|slug`,
 * senão primeiro String não-id, senão o próprio id.
 */
export function pickLabelField(fields, idField) {
  const candidates = fields.filter(
    (f) => f.isString && !f.isList && f.name !== (idField?.name ?? 'id'),
  );
  const preferred = candidates.find((f) => /^(name|title|label|slug)$/i.test(f.name));
  if (preferred) return preferred.name;
  if (candidates[0]) return candidates[0].name;
  return idField?.name ?? 'id';
}
