import { Toaster as SonnerToaster, toast, type ToasterProps } from 'sonner';

/**
 * Ethos-themed Sonner toaster.
 *
 * Mount once at the app root (e.g. inside the root layout). Defaults match
 * doc 02-IDENTIDADE-VISUAL.md: top-right position, rich semantic colors,
 * close button, and `system` theme (since `next-themes` is not installed
 * in the monorepo, Sonner falls back to OS preference).
 *
 * All Sonner props are forwarded — overrides are first-class.
 */
const Toaster = ({
  position = 'top-right',
  richColors = true,
  closeButton = true,
  theme = 'system',
  ...props
}: ToasterProps) => (
  <SonnerToaster
    position={position}
    richColors={richColors}
    closeButton={closeButton}
    theme={theme}
    {...props}
  />
);
Toaster.displayName = 'Toaster';

export { Toaster, toast, type ToasterProps };
