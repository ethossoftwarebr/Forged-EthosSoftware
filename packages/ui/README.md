# @ethos/ui

Biblioteca proprietária de componentes UI da Ethos Forge — primitivos shadcn customizados, compostos, layouts, com preset Tailwind exportável e CSS vars HSL para light/dark mode.

## Instalação

Internamente no monorepo, adicione `"@ethos/ui": "workspace:*"` em `dependencies` do package consumer.

## Uso

### 1) Configurar Tailwind no app/package consumer

```ts
// tailwind.config.ts (consumer)
import type { Config } from 'tailwindcss';
import ethosPreset from '@ethos/ui/tailwind.config';

export default {
  presets: [ethosPreset],
  content: ['./src/**/*.{ts,tsx}', './node_modules/@ethos/ui/dist/**/*.{js,mjs}'],
} satisfies Config;
```

### 2) Importar os globals (CSS vars + base)

```ts
// app/layout.tsx (Next.js) ou src/main.tsx (Vite)
import '@ethos/ui/styles/globals.css';
```

### 3) Consumir componentes

```tsx
import { cn } from '@ethos/ui';
// (componentes virão nos prompts seguintes)
```

## Scripts

```bash
# Build da lib + preset Tailwind
pnpm --filter @ethos/ui build

# Watch mode
pnpm --filter @ethos/ui dev

# Storybook (vitrine viva — Wave 3)
pnpm --filter @ethos/ui storybook
# ou na raiz: pnpm storybook

# Typecheck
pnpm --filter @ethos/ui typecheck

# Lint
pnpm --filter @ethos/ui lint
```

## Estrutura

- `src/index.ts` — entrypoint público
- `src/lib/cn.ts` — helper `cn(...inputs)` (clsx + tailwind-merge)
- `src/styles/globals.css` — Tailwind base + CSS vars HSL (light + dark)
- `tailwind.config.ts` — preset exportável (compilado via tsup → `dist/tailwind.config.js`)
- `postcss.config.js` — tailwindcss + autoprefixer

## Customização por cliente

Projetos clientes redefinem `--primary` (e `--ring`) em seu próprio `globals.css`. Demais tokens (border, radius, tipografia) são "DNA Ethos" e ficam fixos. Ver `docs/02-IDENTIDADE-VISUAL.md`.
