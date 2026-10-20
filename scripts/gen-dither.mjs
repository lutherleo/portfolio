// Generates the dithered portrait for the About section: the photo cropped
// like the page shows it (4:5 from the top), one cell per 2 CSS px at its
// 340px display width, ordered-dithered (Bayer 4×4) into two 1-bit masks:
//   assets/photo-dither-dark.png    light areas inked (for the dark theme)
//   assets/photo-dither-light.png   dark areas inked (for the light theme)
// The page fills them with the accent colour as CSS masks. Chrome decodes and
// crops the image; the masks are written here.
//
//   node scripts/gen-dither.mjs
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { ROOT, chromePath, startServer } from './lib/site.mjs';
import { png1 } from './lib/png1.mjs';

const SOURCE = 'assets/photo-768.webp';
const W = 170, H = 212; // 340 × 425 CSS px at 2 px per cell
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

const server = await startServer();
const browser = await puppeteer.launch({ executablePath: chromePath() });
let lum;
try {
  const page = await browser.newPage();
  await page.goto(`${server.origin}/index.html`, { waitUntil: 'domcontentloaded' });
  lum = await page.evaluate(async (src, W, H) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    // object-fit: cover; object-position: top
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (W - img.naturalWidth * scale) / 2, 0, img.naturalWidth * scale, img.naturalHeight * scale);
    const d = ctx.getImageData(0, 0, W, H).data;
    const out = [];
    for (let i = 0; i < W * H; i++) out.push((0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255);
    return out;
  }, `${server.origin}/${SOURCE}`, W, H);
} finally {
  await browser.close();
  await server.close();
}

// Histogram-equalise (the photo is backlit: the face sits in the shadows),
// then blend back towards the original so the sky doesn't flatten.
const sorted = [...lum].sort((a, b) => a - b);
const rank = v => {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < v) lo = mid + 1; else hi = mid; }
  return lo / sorted.length;
};
const tone = lum.map(v => 0.75 * rank(v) + 0.25 * v);
const bit = (x, y) => tone[y * W + x] > BAYER[(y & 3) * 4 + (x & 3)];

for (const [file, on] of [['photo-dither-dark.png', bit], ['photo-dither-light.png', (x, y) => !bit(x, y)]]) {
  const png = png1(W, H, on);
  await writeFile(join(ROOT, 'assets', file), png);
  console.log(`wrote assets/${file} (${W}×${H}, ${png.length} bytes)`);
}
