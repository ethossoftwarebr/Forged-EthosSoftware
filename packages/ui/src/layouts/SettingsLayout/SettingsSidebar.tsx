import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

export interface SettingsSection {
  key: string;
  label: string;
  icon?: ReactNode;
  /** Opcional: descricao curta exibida no sidebar (ou tooltip). */
  description?: string;
}

export interface SettingsSidebarProps {
  sections: SettingsSection[];
  activeSection: string;
  onSectionChange: (key: string) => void;
  className?: string;
}

/**
 * Sidebar interna do SettingsLayout. Uso interno — exportado pra permitir
 * stories isoladas e composicao avancada, mas nao reexportado de `@ethos/ui`.
 *
 * Layout:
 * - Desktop (`md+`): vertical stack
 * - Mobile (`<md`): horizontal scrollable, com `-mx-4 px-4` pra ocupar a borda da tela
 */
export function SettingsSidebar({
  sections,
  activeSection,
  onSectionChange,
  className,
}: SettingsSidebarProps) {
  return (
    <nav
      aria-label="Secoes de configuracao"
      className={cn(
        '-mx-4 flex gap-1 overflow-x-auto px-4',
        'md:mx-0 md:flex-col md:overflow-visible md:px-0',
        className,
      )}
    >
      {sections.map((section) => {
        const isActive = activeSection === section.key;
        return (
          <button
            key={section.key}
            type="button"
            onClick={() => onSectionChange(section.key)}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors duration-150',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              isActive
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            {section.icon ? (
              <span
                aria-hidden="true"
                className="flex h-4 w-4 shrink-0 items-center justify-center"
              >
                {section.icon}
              </span>
            ) : null}
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
