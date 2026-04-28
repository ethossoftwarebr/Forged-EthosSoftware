import { FlatCompat } from '@eslint/eslintrc';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

import base from './base.mjs';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/**
 * Next.js ESLint flat config.
 * Extends base + Next.js core-web-vitals + react-hooks via FlatCompat.
 *
 * NOTE: eslint-config-next and eslint-plugin-react-hooks@5 still require FlatCompat
 * as of April 2026 — neither exports native flat config arrays.
 */
const nextjs = [
  ...base,
  // eslint-config-next does not yet ship a flat config export; use FlatCompat
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // react-hooks v5 doesn't export a flat config object, so wire it manually
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
];

export default nextjs;
