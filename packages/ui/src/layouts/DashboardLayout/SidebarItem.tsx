import { Badge } from '../../components/Badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/Tooltip';
import { cn } from '../../lib/cn';

import type { SidebarItemConfig } from './sidebarConfig';

interface SidebarItemProps {
  item: SidebarItemConfig;
  active?: boolean;
  collapsed?: boolean;
}

/**
 * Item folha do sidebar (sem children). Em modo collapsed, envolve em Tooltip
 * mostrando o label no hover. Requer `<TooltipProvider>` ancestor.
 */
export function SidebarItem({ item, active, collapsed }: SidebarItemProps) {
  const inner = (
    <button
      type="button"
      onClick={item.onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        active
          ? 'bg-muted text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      {item.icon ? (
        <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center">
          {item.icon}
        </span>
      ) : null}
      {!collapsed ? (
        <>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {item.badge !== undefined ? (
            <Badge variant="secondary" size="sm" className="ml-auto">
              {item.badge}
            </Badge>
          ) : null}
        </>
      ) : null}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}
