import nextjs from '@ethos/config/eslint/nextjs.mjs';

const config = [
  ...nextjs,
  {
    ignores: ['.next/**', 'dist/**', 'node_modules/**', 'next-env.d.ts'],
  },
];

export default config;
