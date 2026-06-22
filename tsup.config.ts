import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'index': 'src/index.ts',
      'colormap/index': 'src/colormap/index.ts',
      'nodes/index': 'src/nodes/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['three', 'plotly.js-dist-min'],
  },
]);
