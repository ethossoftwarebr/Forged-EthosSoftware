// D4 — heurística nome do model → ícone Lucide + override via /// @forge.icon(IconName)
//
// NOTE: spec lista `icon-map.ts`, mas como o CLI é JavaScript ESM puro
// (`index.js`), mantemos a fonte de verdade em `.js`. O arquivo `icon-map.ts`
// paralelo é só um re-export tipado pra contribuidores que abrirem no editor.
// Se override apontar pra um ícone inexistente em `lucide-react`, a build do
// Next.js no Wave 4 falhará — esse é o sinal de validação (aceitável V1).

export const ICON_MAP = {
  Product: 'Package',
  User: 'User',
  Order: 'ShoppingCart',
  Invoice: 'Receipt',
  Customer: 'Users',
  Tenant: 'Building',
  Category: 'Tag',
};

export const DEFAULT_ICON = 'Database';

/**
 * Resolve ícone Lucide pra um model.
 * @param {string} modelName - PascalCase (ex: "Product")
 * @param {string|null} override - vindo de /// @forge.icon(IconName)
 * @returns {string} nome do ícone Lucide (ex: "Package")
 */
export function resolveIcon(modelName, override) {
  if (override) return override;
  return ICON_MAP[modelName] ?? DEFAULT_ICON;
}
