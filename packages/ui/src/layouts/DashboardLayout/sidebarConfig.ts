import type { ReactNode } from 'react';

export interface SidebarItemConfig {
  key: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  badge?: string | number;
  onClick?: () => void;
  /** Quando presente, vira SidebarGroup expandivel. */
  children?: SidebarItemConfig[];
}

export type SidebarConfig = SidebarItemConfig[];

/** Identity helper pra TS narrow + autocomplete em consumers. */
export function defineSidebarConfig(config: SidebarConfig): SidebarConfig {
  return config;
}
