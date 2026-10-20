// Generates the film-grain tile: 64×64 seeded grey speckles with low alpha,
// laid over the whole page at low opacity (plain alpha, no blend mode, so it
// stays a cheap composited layer while scrolling). It is inlined as a data
// URI in style.css's body::after rule rather than shipped as a file: as its
// own request it lengthened the home page's simulated LCP by ~150 ms. At
// ~1.5 KB it is also under Chrome's 0.05 bits-per-pixel floor for LCP
// candidates on a phone screen. Deterministic.
//
//   node scripts/gen-grain.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';
import { pngGreyAlpha } from './lib/png1.mjs';
import { seeded } from '../lattice.js';

const N = 64;
const rng = seeded('grain');
// Mostly empty; a sparse mix of light and dark specks at two strengths
// (few distinct values keep the tile small).
const px = Array.from({ length: N * N }, () => {
  if (rng() < 0.66) return [0, 0];
  const light = rng() < 0.5, strong = rng() < 0.35;
  return light ? [255, strong ? 110 : 60] : [0, strong ? 130 : 70];
});
const png = pngGreyAlpha(N, N, (x, y) => px[y * N + x]);
const cssPath = join(ROOT, 'style.css');
const css = await readFile(cssPath, 'utf8');
const rule = /(body::after \{[^}]*?background: url\(")[^"]*("\))/;
if (!rule.test(css)) throw new Error('style.css: body::after grain url not found');
await writeFile(cssPath, css.replace(rule, `$1data:image/png;base64,${png.toString('base64')}$2`));
console.log(`inlined the grain tile into style.css (${N}×${N}, ${png.length} bytes)`);
