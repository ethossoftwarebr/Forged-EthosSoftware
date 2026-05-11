import globals from 'globals';

import base from '@ethos/config/eslint/base.mjs';

/**
 * Root ESLint flat config — monorepo-wide.
 * Individual apps/packages extend nextjs.mjs or node.mjs locally.
 */
const config = [
  ...base,
  {
    files: ['**/*.config.{js,cjs}', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/generated/**',
      '**/storybook-static/**',
      'pnpm-lock.yaml',
      '**/.pnpm-store/**',
      '**/coverage/**',
      // D8: tools/generators/* tem package.json + node_modules proprios, fora do pnpm workspace.
      // Cliente Forge nao recebe esses arquivos. ESLint monorepo-wide nao deve cobri-los.
      'tools/generators/**',
    ],
  },
];

export default config;
