import { Fragment, type ReactNode } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../components/Breadcrumb';
import { Sheet, SheetContent } from '../../components/Sheet';
import { cn } from '../../lib/cn';

import { Sidebar } from './Sidebar';
import type { SidebarConfig } from './sidebarConfig';
import { Topbar } from './Topbar';
import { UserMenu, type UserMenuProps } from './UserMenu';
import { useSidebarState } from './useSidebarState';

export interface DashboardNotification {
  id: string;
  title: string;
  description?: string;
  read?: boolean;
}

export interface DashboardBreadcrumbItem {
  label: string;
  href?: string;
}

export interface DashboardLayoutProps {
  config: SidebarConfig;
  logo?: ReactNode;
  productName: string;
  activeKey?: string;
  user: UserMenuProps['user'];
  onUserAction: UserMenuProps['onAction'];
  notifications?: DashboardNotification[];
  onNotificationClick?: (id: string) => void;
  searchPlaceholder?: string;
  breadcrumbs?: DashboardBreadcrumbItem[];
  storageKey?: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Layout principal de aplicacao logada. Combina Sidebar (desktop) + Sheet
 * (mobile drawer) + Topbar + main com children e breadcrumbs opcionais.
 *
 * Estado de collapsed/expanded persiste em localStorage via `storageKey`
 * (default `'default'`, chave final `ethos:sidebar:<storageKey>`).
 */
export function DashboardLayout({
  config,
  logo,
  productName,
  activeKey,
  user,
  onUserAction,
  notifications,
  onNotificationClick,
  searchPlaceholder,
  breadcrumbs,
  storageKey,
  defaultCollapsed,
  children,
  className,
}: DashboardLayoutProps) {
  const sidebar = useSidebarState({ storageKey, defaultCollapsed });

  return (
    <div className={cn('bg-background flex h-screen', className)}>
      {/* Desktop Sidebar */}
      <Sidebar
        className="hidden md:flex"
        config={config}
        logo={logo}
        productName={productName}
        activeKey={activeKey}
        collapsed={sidebar.collapsed}
        onToggleCollapse={() => sidebar.setCollapsed((c) => !c)}
        expandedGroups={sidebar.expandedGroups}
        onToggleGroup={sidebar.toggleGroup}
        footer={<UserMenu user={user} onAction={onUserAction} compact={sidebar.collapsed} />}
      />

      {/* Mobile Drawer */}
      <Sheet open={sidebar.mobileOpen} onOpenChange={sidebar.setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 sm:max-w-xs">
          <Sidebar
            className="flex w-full border-r-0"
            config={config}
            logo={logo}
            productName={productName}
            activeKey={activeKey}
            expandedGroups={sidebar.expandedGroups}
            onToggleGroup={sidebar.toggleGroup}
          />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onToggleMobileSidebar={() => sidebar.setMobileOpen(true)}
          searchPlaceholder={searchPlaceholder}
          notifications={notifications}
          onNotificationClick={onNotificationClick}
          user={user}
          onUserAction={onUserAction}
        />
        <main className="flex-1 overflow-y-auto">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <div className="border-b px-6 py-3">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((b, i) => (
                    <Fragment key={`${b.label}-${i}`}>
                      <BreadcrumbItem>
                        {b.href ? (
                          <BreadcrumbLink href={b.href}>{b.label}</BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>{b.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {i < breadcrumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          ) : null}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
DashboardLayout.displayName = 'DashboardLayout';
