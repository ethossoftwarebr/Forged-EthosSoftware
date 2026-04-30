import { Bell, Menu, Search, SunMoon } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '../../components/Button';
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from '../../components/Command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/DropdownMenu';
import { cn } from '../../lib/cn';

import { UserMenu, type UserMenuProps } from './UserMenu';

export interface TopbarNotification {
  id: string;
  title: string;
  description?: string;
  read?: boolean;
}

export interface TopbarProps {
  onToggleMobileSidebar: () => void;
  searchPlaceholder?: string;
  notifications?: TopbarNotification[];
  onNotificationClick?: (id: string) => void;
  user: UserMenuProps['user'];
  onUserAction: UserMenuProps['onAction'];
}

/**
 * Header sticky do dashboard. Inclui:
 * - Botao mobile para abrir sidebar (hidden em md+)
 * - Search via CommandDialog
 * - Toggle de tema agnostico (toggla `<html class="dark">`)
 * - Notificacoes via DropdownMenu
 * - UserMenu compacto
 */
export function Topbar({
  onToggleMobileSidebar,
  searchPlaceholder = 'Buscar...',
  notifications = [],
  onNotificationClick,
  user,
  onUserAction,
}: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Theme toggle (D4 — agnostico, sem next-themes)
  const toggleTheme = useCallback(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark');
  }, []);

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
      {/* Mobile sidebar trigger */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggleMobileSidebar}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* Search */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setSearchOpen(true)}
        className={cn('text-muted-foreground hidden max-w-md flex-1 justify-start sm:inline-flex')}
      >
        <Search className="mr-2 h-4 w-4" aria-hidden="true" />
        <span className="truncate">{searchPlaceholder}</span>
      </Button>
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder={searchPlaceholder} />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        </CommandList>
      </CommandDialog>

      <div className="flex-1 sm:hidden" />

      {/* Theme */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label="Alternar tema"
      >
        <SunMoon className="h-5 w-5" aria-hidden="true" />
      </Button>

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Notificacoes"
            className="relative"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span
                className="bg-destructive absolute right-1 top-1 h-2 w-2 rounded-full"
                aria-hidden="true"
              />
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Notificacoes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <div className="text-muted-foreground px-2 py-6 text-center text-sm">
              Nenhuma notificacao
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => onNotificationClick?.(n.id)}
                className="flex-col items-start gap-0.5"
              >
                <span className={cn('text-sm', !n.read && 'font-medium')}>{n.title}</span>
                {n.description ? (
                  <span className="text-muted-foreground text-xs">{n.description}</span>
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User */}
      <UserMenu user={user} onAction={onUserAction} compact />
    </header>
  );
}
