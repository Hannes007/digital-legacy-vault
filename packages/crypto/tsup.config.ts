import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/shamir.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node22',
  outDir: 'dist',
  external: ['argon2'],
});
