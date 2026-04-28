import base from '@ethos/config/eslint/base.mjs';

/**
 * Root ESLint flat config — monorepo-wide.
 * Individual apps/packages extend nextjs.mjs or node.mjs locally.
 */
const config = [
  ...base,
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/generated/**',
      'pnpm-lock.yaml',
      '**/.pnpm-store/**',
      '**/coverage/**',
    ],
  },
];

export default config;
