import { defineSidebarConfig, type SidebarItemConfig } from '@ethos/ui';
import { LayoutDashboard, Package, Settings } from 'lucide-react';

/**
 * Configuração da sidebar do dashboard.
 *
 * O bloco entre os marcadores `FORGE-AUTOGEN:START` / `FORGE-AUTOGEN:END` é
 * reescrito pelo CLI `tools/generators/forge-page` toda vez que `pnpm forge:gen:frontend`
 * roda (D6 da spec `2026-05-11-ethos-gen-frontend`). Itens fora desses marcadores
 * são preservados — adicione customizações (Dashboard, Settings) aqui livremente,
 * mas NÃO escreva código dentro do bloco AUTOGEN: ele será sobrescrito.
 *
 * Para remover um item gerado, remova a anotação `/// @forge.generate(page)` do
 * model no `schema.prisma` e re-rode o gen.
 */
export const sidebarConfig = defineSidebarConfig([
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  // FORGE-AUTOGEN:START
  {
    key: 'products',
    label: 'Products',
    href: '/products',
    icon: <Package className="h-4 w-4" />,
  },
  // FORGE-AUTOGEN:END
  {
    key: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="h-4 w-4" />,
  },
] satisfies SidebarItemConfig[]);
