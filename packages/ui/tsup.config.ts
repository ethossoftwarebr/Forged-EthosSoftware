import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    external: ['react', 'react-dom', 'lucide-react', '@radix-ui/react-slot'],
    clean: true,
    sourcemap: true,
  },
  {
    entry: ['tailwind.config.ts'],
    format: ['cjs'],
    dts: false,
    clean: false,
    sourcemap: false,
  },
]);
