import globals from 'globals';

import base from './base.mjs';

/**
 * Node.js ESLint flat config (NestJS / scripts).
 * Extends base + adds Node.js globals (Node 20 LTS).
 */
const node = [
  ...base,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];

export default node;
