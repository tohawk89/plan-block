import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      // Match esbuild's text loader: `import css from './styles.css'` gives a string.
      name: 'css-as-text',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source.endsWith('.css') && importer) return resolve(dirname(importer), source) + '.text';
        return null;
      },
      load(id) {
        if (id.endsWith('.css.text')) return `export default ${JSON.stringify(readFileSync(id.slice(0, -5), 'utf8'))};`;
        return null;
      },
    },
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
