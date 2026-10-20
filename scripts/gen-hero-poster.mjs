// Generates assets/hero-poster.png: the hero lattice's first frame, ordered-
// dithered to 1 bit. It is used as a CSS mask filled with the accent colour,
// so one file serves both themes, and it is what touch, reduced-motion and
// not-yet-loaded visitors see. The camera matches hero3d.js (40° vertical
// FOV, distance 7, fog 5 → 9.2) and its rotation at START_T, so the live
// canvas fades in over it without a jump.
//
//   node scripts/gen-hero-poster.mjs
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';
import { png1 } from './lib/png1.mjs';
import { START_T, lattice, rotate } from '../lattice.js';

export const POSTER = { size: 300, cameraZ: 7, fov: 40, fogNear: 5, fogFar: 9.2, gain: 2.8 };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const { size: N, cameraZ, fov, fogNear, fogFar, gain } = POSTER;
const f = 1 / Math.tan((fov / 2) * Math.PI / 180);
const buf = new Float32Array(N * N);
const rotY = START_T * 0.14, rotX = Math.sin(START_T * 0.23) * 0.18;
const screen = p => {
  const [x, y, z] = rotate(p, rotY, rotX);
  const d = cameraZ - z;
  return { x: ((x * f) / d + 1) / 2 * N, y: (1 - (y * f) / d) / 2 * N, fog: Math.min(1, Math.max(0, (fogFar - d) / (fogFar - fogNear))) };
};
const splat = (x, y, v) => {
  const x0 = Math.floor(x - 0.5), y0 = Math.floor(y - 0.5), fx = x - 0.5 - x0, fy = y - 0.5 - y0;
  for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const px = x0 + dx, py = y0 + dy;
    if (px >= 0 && py >= 0 && px < N && py < N) buf[py * N + px] += v * w;
  }
};
const line = (a, b, v) => {
  const A = screen(a), B = screen(b);
  const steps = Math.max(1, Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) * 2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    splat(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t, (v * (A.fog + (B.fog - A.fog) * t)) / 2);
  }
};

const { nodes, edges, index } = lattice();
for (const [a, b] of edges) line(nodes[a].p, nodes[b].p, 0.3);
for (const n of nodes) { const s = screen(n.p); splat(s.x, s.y, 0.9 * s.fog); }
// The "shortest vector" and its end points, as in hero3d.js.
const origin = nodes[index.get('0,0,0')].p, tip = nodes[index.get('1,-1,1')].p;
line(origin, tip, 0.9);
for (const p of [origin, tip]) { const s = screen(p); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) splat(s.x + dx, s.y + dy, 1); }

const png = png1(N, N, (x, y) => buf[y * N + x] * gain > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16);
await writeFile(join(ROOT, 'assets/hero-poster.png'), png);
console.log(`wrote assets/hero-poster.png (${N}×${N}, ${png.length} bytes)`);
