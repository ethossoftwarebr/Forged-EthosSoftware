import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../../components/Button';
import { TooltipProvider } from '../../components/Tooltip';
import { cn } from '../../lib/cn';

import type { SidebarConfig } from './sidebarConfig';
import { SidebarGroup } from './SidebarGroup';
import { SidebarItem } from './SidebarItem';

export interface SidebarProps {
  config: SidebarConfig;
  logo?: ReactNode;
  productName: string;
  activeKey?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
  /** Footer slot. UserMenu vai aqui no DashboardLayout. */
  footer?: ReactNode;
  className?: string;
}

/**
 * Container vertical da sidebar. Renderiza brand + nav + footer (opcional) +
 * botao de colapsar (opcional). Aplica `TooltipProvider` no escopo para que
 * SidebarItems em modo collapsed possam usar tooltips.
 */
export function Sidebar({
  config,
  logo,
  productName,
  activeKey,
  collapsed,
  onToggleCollapse,
  expandedGroups,
  onToggleGroup,
  footer,
  className,
}: SidebarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'bg-card flex flex-col border-r transition-[width] duration-200 ease-out',
          collapsed ? 'w-16' : 'w-64',
          className,
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex h-14 shrink-0 items-center gap-2 border-b px-4',
            collapsed && 'justify-center px-2',
          )}
        >
          {logo ? <div className="shrink-0">{logo}</div> : null}
          {!collapsed ? (
            <span className="truncate font-semibold tracking-tight">{productName}</span>
          ) : null}
        </div>

        {/* Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {config.map((item) =>
            item.children && item.children.length > 0 ? (
              <SidebarGroup
                key={item.key}
                item={item}
                expanded={expandedGroups[item.key] ?? false}
                onToggle={() => onToggleGroup(item.key)}
                activeKey={activeKey}
                collapsed={collapsed}
              />
            ) : (
              <SidebarItem
                key={item.key}
                item={item}
                active={item.key === activeKey}
                collapsed={collapsed}
              />
            ),
          )}
        </nav>

        {/* Footer + Collapse */}
        <div className="shrink-0 border-t p-2">
          {footer ? (
            <div className={cn('mb-2', collapsed && 'flex justify-center')}>{footer}</div>
          ) : null}
          {onToggleCollapse ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className={cn('w-full', collapsed && 'px-0')}
              aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
            >
              <ChevronLeft
                className={cn(
                  'h-4 w-4 transition-transform duration-150',
                  collapsed && 'rotate-180',
                )}
                aria-hidden="true"
              />
              {!collapsed ? <span className="ml-2">Colapsar</span> : null}
            </Button>
          ) : null}
        </div>
      </aside>
    </TooltipProvider>
  );
}
