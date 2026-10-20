// Generates the site's marks from lattice.js, deterministically:
//   assets/marks/monogram.svg      "LKP" traced through lattice nodes, on its dot grid
//   assets/marks/monogram-mark.svg the same letters without the grid, for small sizes
//   favicon.svg                    a bold "K" from the same lattice on a dark tile
//   assets/marks/<slug>.svg        one lattice glyph per project case page
// and refreshes the inline glyph copies in projects.html and the case pages.
// Everything is drawn in currentColor (the favicon excepted), so inline
// copies follow the page theme. Re-running produces byte-identical files.
//
//   node scripts/gen-marks.mjs
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';
import { BASIS, lattice, project, seeded } from '../lattice.js';

const OUT = join(ROOT, 'assets/marks');
const r1 = n => Math.round(n * 10) / 10;
const r2 = n => Math.round(n * 100) / 100;

/* ── Monogram ───────────────────────────────────────
   Letters live on integer (i, j) lattice coordinates (j up), three columns
   wide and five rows tall, one empty column between letters. Every stroke
   runs from node to node, and every node it crosses is a lattice point. */
const LETTERS = [
  [[[0, 4], [0, 0], [2, 0]]],                                   // L
  [[[0, 4], [0, 0]], [[2, 4], [0, 2], [2, 0]]],                 // K
  [[[0, 0], [0, 4], [2, 4], [2, 2], [0, 2]]],                   // P
];
const place = letters => letters.flatMap((letter, n) => letter.map(line => line.map(([i, j]) => [i + n * 4, j])));

// The front face of the 3D lattice: b0 and b1 seen head-on.
const S = 10;
const at = ([i, j]) => [r2((i * BASIS[0][0] + j * BASIS[1][0]) * S), r2(-(i * BASIS[0][1] + j * BASIS[1][1]) * S)];

function nodesOn(line) {
  const out = [];
  for (let s = 0; s < line.length - 1; s++) {
    const [a, b] = [line[s], line[s + 1]];
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (let t = 0; t < steps; t++) out.push([a[0] + ((b[0] - a[0]) / steps) * t, a[1] + ((b[1] - a[1]) / steps) * t]);
  }
  out.push(line.at(-1));
  return out;
}

function monogram({ letters = LETTERS, grid = true, stroke = 2, dot = 1.45, faint = 0.6 } = {}) {
  const STROKES = place(letters);
  const cols = letters.length * 4 - 2;
  const lit = new Set(STROKES.flatMap(nodesOn).map(p => p.join(',')));
  const pts = [];
  for (let i = grid ? -1 : 0; i <= (grid ? cols + 1 : cols); i++) {
    for (let j = grid ? -1 : 0; j <= (grid ? 5 : 4); j++) pts.push([i, j]);
  }
  const xy = pts.map(at);
  const xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
  const pad = stroke * 1.5;
  const box = [r2(Math.min(...xs) - pad), r2(Math.min(...ys) - pad), r2(Math.max(...xs) - Math.min(...xs) + pad * 2), r2(Math.max(...ys) - Math.min(...ys) + pad * 2)];
  const faintDots = pts.filter(p => !lit.has(p.join(','))).map(at).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${faint}"/>`).join('');
  const litDots = [...lit].map(k => at(k.split(',').map(Number))).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${dot}"/>`).join('');
  const paths = STROKES.map(line => `M${line.map(at).map(p => p.join(' ')).join('L')}`).join('');
  return { box, body: `${grid ? `<g opacity=".32">${faintDots}</g>` : ''}<path d="${paths}" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/><g>${litDots}</g>` };
}

function monogramSvg(options) {
  const { box, body } = monogram(options);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" fill="currentColor" aria-hidden="true">${body}</svg>\n`;
}

/* Favicon: "LKP" is unreadable at 16px, so the K alone, bold, filling a dark tile. */
function faviconSvg() {
  const { box, body } = monogram({ letters: [LETTERS[1]], grid: false, stroke: 4.2, dot: 2.6 });
  const size = Math.max(box[2], box[3]) + 5;
  const tx = r2(-box[0] + (size - box[2]) / 2), ty = r2(-box[1] + (size - box[3]) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(size)} ${r2(size)}">` +
    `<rect width="${r2(size)}" height="${r2(size)}" rx="${r2(size * 0.2)}" fill="#0e0f0b"/>` +
    `<g transform="translate(${tx} ${ty})" fill="#5ad48e" color="#5ad48e">${body}</g></svg>\n`;
}

/* ── Project glyphs ─────────────────────────────────
   A small lattice seen from an angle seeded by the project's slug, with a
   seeded non-backtracking walk highlighted: a fingerprint per project. */
function glyphSvg(slug) {
  const rng = seeded(slug);
  const { nodes, edges, neighbours } = lattice({ radius: 1.55, n: 3 });
  const rotY = rng() * Math.PI * 2, rotX = (rng() - 0.5) * 0.9;
  const P = nodes.map(n => project(n.p, rotY, rotX, 6));
  const W = 200, scale = 52;
  const sx = p => r1(W / 2 + p[0] * scale), sy = p => r1(W / 2 + p[1] * scale);
  // Edges and dots are bucketed by depth into a few shared paths (dots as
  // zero-length round-capped segments), which keeps each glyph small enough
  // to inline.
  const bucket = (depth, levels) => levels[Math.max(0, Math.min(levels.length - 1, Math.floor((depth - 0.8) * 2.2 * levels.length)))];
  const EDGE = [0.12, 0.22, 0.34, 0.48];
  const byOpacity = new Map(EDGE.map(o => [o, '']));
  for (const [a, b] of edges) {
    const o = bucket((P[a][2] + P[b][2]) / 2, EDGE);
    byOpacity.set(o, byOpacity.get(o) + `M${sx(P[a])} ${sy(P[a])}L${sx(P[b])} ${sy(P[b])}`);
  }
  const back = [...byOpacity].filter(([, d]) => d).map(([o, d]) => `<path opacity="${o}" d="${d}"/>`).join('');
  const DOT = [0.25, 0.45, 0.7];
  const dotsBy = new Map(DOT.map(o => [o, '']));
  P.forEach(p => { const o = bucket(p[2], DOT); dotsBy.set(o, dotsBy.get(o) + `M${sx(p)} ${sy(p)}h0`); });
  const dots = [...dotsBy].filter(([, d]) => d).map(([o, d]) => `<path opacity="${o}" d="${d}"/>`).join('');
  // Walk from a node near the centre.
  const central = nodes.map((n, i) => [Math.hypot(...n.p), i]).sort((a, b) => a[0] - b[0]).slice(0, 7).map(([, i]) => i);
  let at = central[Math.floor(rng() * central.length)], prev = -1;
  const walk = [at];
  for (let s = 0; s < 6; s++) {
    const options = neighbours[at].filter(n => n !== prev && !walk.includes(n));
    if (!options.length) break;
    [prev, at] = [at, options[Math.floor(rng() * options.length)]];
    walk.push(at);
  }
  const path = walk.map((i, k) => `${k ? 'L' : 'M'}${sx(P[i])} ${sy(P[i])}`).join('');
  const ends = [walk[0], walk.at(-1)].map(i => `<circle cx="${sx(P[i])}" cy="${sy(P[i])}" r="3.4"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" fill="currentColor" aria-hidden="true">` +
    `<g fill="none" stroke="currentColor" stroke-width=".8">${back}</g>` +
    `<g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">${dots}</g>` +
    `<path d="${path}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${ends}</svg>\n`;
}

await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, 'monogram.svg'), monogramSvg());
await writeFile(join(OUT, 'monogram-mark.svg'), monogramSvg({ grid: false, stroke: 3.4, dot: 2.1 }));
await writeFile(join(ROOT, 'favicon.svg'), faviconSvg());
const slugs = (await readdir(join(ROOT, 'projects'))).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)).sort();
for (const slug of slugs) await writeFile(join(OUT, `${slug}.svg`), glyphSvg(slug));
console.log(`wrote monogram.svg, favicon.svg and ${slugs.length} project glyphs`);

/* ── Inline copies ──────────────────────────────────
   Pages embed glyphs inline (so they take the theme's colour) between
   <!-- glyph:SLUG:start --> … <!-- glyph:SLUG:end --> markers; refresh them so
   they always match the files above. */
const inlineGlyph = slug => glyphSvg(slug).trim()
  .replace('<svg xmlns="http://www.w3.org/2000/svg" ', '<svg class="glyph-svg" focusable="false" ');
const pages = ['projects.html', ...slugs.map(s => `projects/${s}.html`)];
let synced = 0;
for (const page of pages) {
  const path = join(ROOT, page);
  const html = await readFile(path, 'utf8');
  const next = html.replace(/(<!-- glyph:([a-z0-9-]+):start -->)[\s\S]*?(<!-- glyph:\2:end -->)/g, (_, open, slug, close) => {
    if (!slugs.includes(slug)) throw new Error(`${page}: no glyph for "${slug}"`);
    synced++;
    return `${open}${inlineGlyph(slug)}${close}`;
  });
  if (next !== html) await writeFile(path, next);
}
console.log(`synced ${synced} inline glyphs`);
