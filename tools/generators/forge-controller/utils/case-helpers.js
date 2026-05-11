// Conversões de caso pra geração de nomes
// Product → products (resource), Product (className), product (varName)
// OrderItem → order-items (resource), OrderItem (className), orderItem (varName)

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
  // Pluralização simples — cobre casos comuns. Inglês only por enquanto.
  // Para irregulares (man → men, mouse → mice), aceitar override via /// @forge.plural() no model (futuro V2).
  if (/[^aeiou]y$/i.test(str)) return str.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/i.test(str)) return str + 'es';
  return str + 's';
}

export function resourcePath(modelName) {
  // Product → products | OrderItem → order-items | Category → categories
  return pluralize(toKebabCase(modelName));
}
