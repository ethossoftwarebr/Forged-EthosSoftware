// Conversões de caso pra geração de nomes (espelha tools/generators/forge-controller/utils/case-helpers.js
// pra manter consistência interna — qualquer divergência aqui é bug).
// Product → products (resource), Product (className), product (varName)
// OrderItem → order-items (resource), OrderItem (className), orderItem (varName)

import _pluralize from 'pluralize';

export function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

export function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function pluralize(str) {
  // Pluralização via lib `pluralize` — cobre irregulares (person→people, mouse→mice, goose→geese)
  // e preserva case. Para PT-BR ou overrides custom, aceitar via /// @forge.plural() no model (futuro V2).
  return _pluralize(str);
}

export function resourcePath(modelName) {
  // Product → products | OrderItem → order-items | Category → categories
  return pluralize(toKebabCase(modelName));
}

/** PascalCase plural — Product → Products | Category → Categories | Person → People */
export function pluralPascal(modelName) {
  // A lib `pluralize` preserva o case do input (PascalCase entra, PascalCase sai).
  // Delega pra `pluralize()` local pra herdar futuros overrides (ex: @forge.plural).
  return pluralize(modelName);
}
