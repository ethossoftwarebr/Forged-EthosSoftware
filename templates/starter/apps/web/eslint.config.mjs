import nextjs from '@ethos/config/eslint/nextjs.mjs';

const config = [
  ...nextjs,
  {
    ignores: ['.next/**', 'dist/**', 'node_modules/**', 'next-env.d.ts', 'src/generated/**'],
  },
];

export default config;
