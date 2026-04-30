import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/cn';

import { SettingsSidebar, type SettingsSection } from './SettingsSidebar';

export type { SettingsSection } from './SettingsSidebar';

export interface SettingsLayoutProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  sections: SettingsSection[];
  activeSection: string;
  onSectionChange: (key: string) => void;
  children: ReactNode;
  /** Titulo do layout (h1). Default: 'Configuracoes'. */
  title?: string;
}

const SettingsLayout = forwardRef<HTMLDivElement, SettingsLayoutProps>(
  ({ sections, activeSection, onSectionChange, children, title, className, ...props }, ref) => (
    <div ref={ref} className={cn('mx-auto max-w-6xl px-4 py-8', className)} {...props}>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{title ?? 'Configuracoes'}</h1>
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-60 md:shrink-0">
          <SettingsSidebar
            sections={sections}
            activeSection={activeSection}
            onSectionChange={onSectionChange}
          />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  ),
);
SettingsLayout.displayName = 'SettingsLayout';

export { SettingsLayout };
