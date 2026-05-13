import node from '@ethos/config/eslint/node.mjs';
import globals from 'globals';

/**
 * ESLint flat config — @ethos/ai-chat
 *
 * Package triplo (server NestJS + client React + shared types).
 * Extende node.mjs (Node globals) e acrescenta browser globals para src/client/*.
 */
const config = [
  ...node,
  {
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];

export default config;
