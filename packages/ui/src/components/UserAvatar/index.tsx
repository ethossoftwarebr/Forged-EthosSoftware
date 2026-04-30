import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn';
import { Avatar, AvatarFallback, AvatarImage } from '../Avatar';

type AvatarRootProps = ComponentPropsWithoutRef<typeof Avatar>;

export interface UserAvatarProps extends Omit<AvatarRootProps, 'children'> {
  /** Nome completo do usuario — usado para iniciais e como `alt` da imagem. */
  name: string;
  /** URL da imagem. Se ausente ou falhar, renderiza fallback de iniciais. */
  src?: string;
  /** Tamanho do avatar (mapeia para `avatarVariants`). */
  size?: AvatarRootProps['size'];
  /** Mostra um indicador de presenca verde no canto inferior-direito. */
  online?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

const UserAvatar = forwardRef<HTMLSpanElement, UserAvatarProps>(
  ({ className, name, src, size, online = false, ...props }, ref) => {
    const initials = getInitials(name);

    return (
      <span className="relative inline-block">
        <Avatar ref={ref} size={size} className={cn(className)} {...props}>
          {src ? <AvatarImage src={src} alt={name} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {online ? (
          <span
            aria-label="Online"
            className="border-background absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 bg-emerald-500"
          />
        ) : null}
      </span>
    );
  },
);
UserAvatar.displayName = 'UserAvatar';

export { UserAvatar };
