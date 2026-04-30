import { Info, TriangleAlert } from 'lucide-react';
import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from '../Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../Dialog';

import type { ConfirmDialogContextValue, ConfirmOptions, ConfirmVariant } from './types';

export const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

const variantIconColor: Record<ConfirmVariant, string> = {
  default: '',
  destructive: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const VariantIcon = ({ variant }: { variant: ConfirmVariant }) => {
  if (variant === 'warning') {
    return (
      <TriangleAlert aria-hidden="true" className={`mb-2 h-6 w-6 ${variantIconColor.warning}`} />
    );
  }
  if (variant === 'info') {
    return <Info aria-hidden="true" className={`mb-2 h-6 w-6 ${variantIconColor.info}`} />;
  }
  return null;
};

export interface ConfirmDialogProviderProps {
  children: ReactNode;
}

export function ConfirmDialogProvider({ children }: ConfirmDialogProviderProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const resolve = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        resolve(false);
      }
    },
    [resolve],
  );

  const contextValue = useMemo<ConfirmDialogContextValue>(() => ({ confirm }), [confirm]);

  const variant: ConfirmVariant = options?.variant ?? 'default';
  const confirmButtonVariant = variant === 'destructive' ? 'destructive' : 'default';

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            {variant === 'warning' || variant === 'info' ? <VariantIcon variant={variant} /> : null}
            <DialogTitle>{options?.title ?? ''}</DialogTitle>
            {options?.description ? (
              <DialogDescription>{options.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => resolve(false)}>
              {options?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button variant={confirmButtonVariant} onClick={() => resolve(true)}>
              {options?.confirmLabel ?? 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}
