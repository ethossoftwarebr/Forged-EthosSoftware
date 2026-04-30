import { cn } from '../../lib/cn';
import { Button } from '../Button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../Sheet';

import { FieldsRenderer } from './FieldsRenderer';
import type { FiltersPanelProps } from './types';

function FiltersPanel({
  filters,
  values,
  onChange,
  onClear,
  onApply,
  mode = 'sheet',
  trigger,
  title = 'Filtros',
  applyLabel = 'Aplicar',
  clearLabel = 'Limpar tudo',
  className,
}: FiltersPanelProps) {
  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange({});
    }
  };

  const body = (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex-1 overflow-y-auto px-1">
        <FieldsRenderer filters={filters} values={values} onChange={onChange} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-4">
        <Button variant="ghost" type="button" onClick={handleClear}>
          {clearLabel}
        </Button>
        {onApply ? (
          <Button type="button" onClick={onApply}>
            {applyLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );

  if (mode === 'inline') {
    return body;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" type="button">
            {title}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex-1 overflow-hidden">{body}</div>
      </SheetContent>
    </Sheet>
  );
}
FiltersPanel.displayName = 'FiltersPanel';

export { FiltersPanel };
