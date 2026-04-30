import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../../components/DropdownMenu';
import { UserAvatar } from '../../components/UserAvatar';
import { cn } from '../../lib/cn';

export type UserMenuAction =
  | 'profile'
  | 'settings'
  | 'theme:light'
  | 'theme:dark'
  | 'theme:system'
  | 'signout';

export interface UserMenuProps {
  user: { name: string; email?: string; avatarSrc?: string };
  onAction: (key: UserMenuAction) => void;
  /** Quando true, mostra so avatar (no collapsed sidebar ou Topbar). */
  compact?: boolean;
}

/**
 * DropdownMenu sobre UserAvatar. Abre menu com perfil / settings / tema /
 * signout. O consumer reage no callback `onAction` — UserMenu nao executa
 * navegacao nem toggla tema diretamente.
 */
export function UserMenu({ user, onAction, compact }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors duration-150',
            'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            compact && 'p-0',
          )}
          aria-label={`Menu de ${user.name}`}
        >
          <UserAvatar name={user.name} src={user.avatarSrc} size="sm" />
          {!compact ? (
            <div className="min-w-0 text-left">
              <div className="truncate text-sm font-medium">{user.name}</div>
              {user.email ? (
                <div className="text-muted-foreground truncate text-xs">{user.email}</div>
              ) : null}
            </div>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction('profile')}>Perfil</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('settings')}>Configuracoes</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Tema</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onAction('theme:light')}>Claro</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('theme:dark')}>Escuro</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('theme:system')}>Sistema</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onAction('signout')}
          className="text-destructive focus:text-destructive"
        >
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
