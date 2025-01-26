const esbuild = require('esbuild');
const { esbuildCommonjs } = require('@originjs/vite-plugin-commonjs');

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    bundle: true, // Bundle all dependencies into one file
    outfile: './dist/worker.js', // Output file
    platform: 'node',
    format: 'esm',
    target: 'es2022',
    minify: true,
    charset: 'utf8',
    sourcemap: false,
    loader: { '.node': 'file' },
    minify: true,
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.mjs', '.js', '.json'],
    mainFields: ['worker', 'browser', 'module', 'jsnext', 'main'],
    conditions: ['worker', 'browser', 'import', 'production'],
    plugins: [
      esbuildCommonjs({
        include: ['os', 'os']
      })
    ]
  })
  .catch(() => process.exit(1));
