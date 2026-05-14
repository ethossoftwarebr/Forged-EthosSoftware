import node from '@ethos/config/eslint/node.mjs';

/**
 * ESLint flat config — @ethos/email
 *
 * Package server-only — extende node.mjs (Node globals).
 */
const config = [
  ...node,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];

export default config;
