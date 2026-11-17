// Builds:
//  - dist/client.js, web-component.js, vue.js, react.js   ESM, for npm users
//  - ../resources/dist/plan-block.js         IIFE, served by the Laravel package (no npm needed)
//  - ../resources/dist/plan-block.css        the same styles the component injects
import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const shared = {
  bundle: true,
  target: 'es2022',
  loader: { '.css': 'text' },
  logLevel: 'info',
};

await build({
  ...shared,
  entryPoints: {
    client: 'src/client/index.ts',
    'web-component': 'src/web-component/index.ts',
    vue: 'src/vue/index.ts',
    react: 'src/react/index.ts',
  },
  outdir: 'dist',
  format: 'esm',
  external: ['vue', 'react', 'react-dom'],
  splitting: true,
  sourcemap: true,
});

await build({
  ...shared,
  entryPoints: ['src/browser.ts'],
  outfile: '../resources/dist/plan-block.js',
  format: 'iife',
  minify: true,
  legalComments: 'none',
});

await mkdir('../resources/dist', { recursive: true });
await copyFile('src/web-component/styles.css', '../resources/dist/plan-block.css');
