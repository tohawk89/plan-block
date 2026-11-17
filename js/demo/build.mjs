// Bundles the Vue and React demos for the workbench /vue and /react pages.
import { build } from 'esbuild';

await build({
  entryPoints: ['demo/vue-demo.ts', 'demo/react-demo.ts'],
  outdir: 'demo/dist',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  loader: { '.css': 'text' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
});
