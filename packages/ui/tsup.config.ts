import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
  external: ['react', 'react-dom', 'lucide-react'],
  // Preserve the "use client" directive for Next.js consumers.
  banner: { js: '"use client";' },
});
