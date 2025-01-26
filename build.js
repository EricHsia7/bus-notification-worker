const esbuild = require('esbuild');

esbuild
  .build({
    entryPoints: ['./src/index.ts'], // Entry point of your Cloudflare Worker code
    bundle: true, // Bundle all dependencies into one file
    outfile: './dist/worker.js', // Output file
    platform: 'neutral', // Cloudflare Workers use a specific runtime, so avoid `node` platform features
    format: 'esm', // Use ECMAScript modules
    target: 'es2022', // Cloudflare Workers support modern JavaScript
    minify: true // Minify the output for better performance
  })
  .catch(() => process.exit(1));
