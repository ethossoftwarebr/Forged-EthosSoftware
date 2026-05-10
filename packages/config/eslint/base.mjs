import { createRequire } from 'node:module';

import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const require = createRequire(import.meta.url);
const ethosPlugin = require('./plugins/ethos.cjs');

/**
 * Base ESLint flat config — TypeScript + import rules, no framework specifics.
 * Extend this in nextjs.mjs and node.mjs.
 *
 * Regras custom Forge (namespace `ethos/`):
 * - `ethos/jose-require-algorithms` (D13.8) — exige `algorithms` em jwtVerify().
 */
const base = tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  plugins: {
    import: importPlugin,
    ethos: ethosPlugin,
  },
  languageOptions: {
    globals: {
      ...globals.es2022,
    },
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
      node: true,
    },
  },
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',

    // Import ordering
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always',
      },
    ],
    'import/no-duplicates': 'error',

    // Forge custom (D13.8) — Algorithm Confusion defense
    'ethos/jose-require-algorithms': 'error',
  },
});

export default base;
