/**
 * Plugin ESLint local da Forge — agrupa regras custom em namespace `ethos/`.
 * Usado nos flat configs (base.mjs, nextjs.mjs, node.mjs).
 */
const { joseRequireAlgorithms } = require('../rules/jose-require-algorithms.cjs');

module.exports = {
  meta: {
    name: 'ethos',
    version: '0.1.0',
  },
  rules: {
    'jose-require-algorithms': joseRequireAlgorithms,
  },
};
