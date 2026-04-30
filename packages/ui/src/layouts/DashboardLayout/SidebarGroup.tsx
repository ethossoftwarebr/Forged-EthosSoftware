import { ChevronRight } from 'lucide-react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/Collapsible';
import { cn } from '../../lib/cn';

import type { SidebarItemConfig } from './sidebarConfig';
import { SidebarItem } from './SidebarItem';

interface SidebarGroupProps {
  item: SidebarItemConfig;
  expanded: boolean;
  onToggle: () => void;
  activeKey?: string;
  collapsed?: boolean;
}

/**
 * Grupo expandivel do sidebar. Em modo collapsed, vira item simples com Tooltip
 * e a expansao e ignorada (clique chama onToggle, mas children nao aparecem).
 */
export function SidebarGroup({
  item,
  expanded,
  onToggle,
  activeKey,
  collapsed,
}: SidebarGroupProps) {
  const children = item.children ?? [];
  const hasActiveChild = children.some((c) => c.key === activeKey);

  if (collapsed) {
    return <SidebarItem item={{ ...item, onClick: onToggle }} active={hasActiveChild} collapsed />;
  }

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
            'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            hasActiveChild
              ? 'text-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          )}
        >
          {item.icon ? (
            <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center">
              {item.icon}
            </span>
          ) : null}
          <span className="flex-1 truncate text-left">{item.label}</span>
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-150',
              expanded && 'rotate-90',
            )}
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="border-border ml-7 mt-1 space-y-0.5 border-l pl-3">
          {children.map((child) => (
            <li key={child.key}>
              <SidebarItem item={child} active={child.key === activeKey} />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
