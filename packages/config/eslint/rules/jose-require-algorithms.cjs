/**
 * ESLint custom rule — `ethos/jose-require-algorithms` (D13.8)
 *
 * Trava o uso da função `jwtVerify` da lib `jose` exigindo `algorithms` no
 * options object. Defesa real contra Algorithm Confusion attack: sem
 * `algorithms`, jose aceita qualquer algoritmo declarado no token (incluindo
 * none/HS256 forjados).
 *
 * Boa: jwtVerify(token, key, { algorithms: ['EdDSA'], ... })
 * Ruim: jwtVerify(token, key)
 * Ruim: jwtVerify(token, key, { issuer: 'x' })  // sem algorithms
 *
 * Regra trabalha em AST simples (CallExpression) — não exige type info.
 */

/** @type {import('eslint').Rule.RuleModule} */
const joseRequireAlgorithms = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'jose.jwtVerify() deve sempre receber `algorithms` no options object pra prevenir Algorithm Confusion (Forge D13.8).',
    },
    schema: [],
    messages: {
      missingAlgorithms:
        'jwtVerify chamado sem `algorithms` em options — vulnerable a Algorithm Confusion. ' +
        'Use: jwtVerify(token, key, { algorithms: ["EdDSA"] }).',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        // Detecta chamadas a `jwtVerify(...)` — direto ou via member access
        // (`jose.jwtVerify`).
        const callee = node.callee;
        const isJwtVerify =
          (callee.type === 'Identifier' && callee.name === 'jwtVerify') ||
          (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'jwtVerify');

        if (!isJwtVerify) return;

        // jwtVerify(token, key, options?) — terceiro arg
        const optionsArg = node.arguments[2];

        // Sem options → erro
        if (!optionsArg) {
          context.report({ node, messageId: 'missingAlgorithms' });
          return;
        }

        // Options não é object literal (e.g. spread, var) → conservativo: erro
        // Caller deve usar literal pra que o lint consiga verificar.
        if (optionsArg.type !== 'ObjectExpression') {
          context.report({ node, messageId: 'missingAlgorithms' });
          return;
        }

        const hasAlgorithms = optionsArg.properties.some(
          (p) =>
            p.type === 'Property' &&
            ((p.key.type === 'Identifier' && p.key.name === 'algorithms') ||
              (p.key.type === 'Literal' && p.key.value === 'algorithms')),
        );

        if (!hasAlgorithms) {
          context.report({ node, messageId: 'missingAlgorithms' });
        }
      },
    };
  },
};

module.exports = { joseRequireAlgorithms };
