import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // `resend` é peer dep — fica como external pra preservar lazy import
  // (consumers que só usam o type pagam zero cold start).
  external: ['resend'],
});
