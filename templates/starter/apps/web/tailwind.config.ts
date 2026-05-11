import presetModule from '@ethos/ui/tailwind.config';
import type { Config } from 'tailwindcss';

// O dist do `@ethos/ui` (tsup CJS) expõe o preset como `default` quando
// importado de um TS módulo ESM. Sem esse unwrap o Tailwind não enxerga
// `theme.extend.colors.border` → `@apply border-border` quebra o build.
const preset = (presetModule as { default?: Config }).default ?? presetModule;

const config: Config = {
  presets: [preset as Config],
  content: ['./src/**/*.{ts,tsx}', '../../../../packages/ui/src/**/*.{ts,tsx}'],
};

export default config;
