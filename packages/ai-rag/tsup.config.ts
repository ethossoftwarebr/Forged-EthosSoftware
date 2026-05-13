import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'server/index': 'src/server/index.ts',
    'client/index': 'src/client/index.ts',
    'shared/index': 'src/shared/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    '@anthropic-ai/sdk',
    '@nestjs/common',
    '@nestjs/core',
    '@prisma/client',
    'react',
    'react-dom',
    '@tanstack/react-query',
    'rxjs',
    'bullmq',
    'ioredis',
  ],
});
