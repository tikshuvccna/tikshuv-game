// בונה את src/main.js (כולל Three.js) לקובץ אחד: game3d.js. הרצה: npm install && npm run build
import { build, context } from 'esbuild';
const opts = { entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, outfile: 'game3d.js', target: 'es2019', legalComments: 'none' };
if (process.argv.includes('--watch')) { const c = await context(opts); await c.watch(); } else await build(opts);
