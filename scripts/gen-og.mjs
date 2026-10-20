// Renders assets/og-image.png (1200×630), the social card: the monogram,
// name and role on the left, the dithered lattice poster on the right, in
// the site's dark palette and fonts. Built from the same assets as the site
// (hero-poster.png, monogram.svg), so it changes when they do.
//
//   node scripts/gen-og.mjs
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { ROOT, chromePath, startServer } from './lib/site.mjs';

const monogram = await readFile(join(ROOT, 'assets/marks/monogram.svg'), 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../../style.css">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: var(--bg); }
  .card { position: relative; width: 1200px; height: 630px; padding: 64px 72px; box-sizing: border-box; display: flex; flex-direction: column; }
  .lattice { position: absolute; top: -10px; right: -140px; width: 650px; height: 650px; background: var(--accent);
    mask: url("../../assets/hero-poster.png") center / 100% 100% no-repeat; image-rendering: pixelated; }
  .mono { width: 150px; color: var(--accent); }
  .mono svg { display: block; width: 100%; height: auto; }
  h1 { margin: auto 0 0; font: 700 104px/0.9 var(--font-sans); letter-spacing: -0.055em; text-transform: uppercase; color: var(--text); }
  .role { margin: 28px 0 0; font: 400 24px/1.3 var(--font-mono); color: var(--text-2); }
  .topics { margin: 14px 0 0; font: 500 22px/1.3 var(--font-pixel); letter-spacing: 0.02em; color: var(--accent); }
  .url { position: absolute; left: 260px; top: 96px; font: 400 20px var(--font-mono); color: var(--text-3); }
</style></head>
<body><div class="card">
  <div class="lattice"></div>
  <div class="mono">${monogram}</div>
  <h1>Love Kush<br>Pranu</h1>
  <p class="role">Cybersecurity engineer · NYU Tandon MS ’26</p>
  <p class="topics">post-quantum crypto · kernel fuzzing · adversarial ML</p>
  <p class="url">lutherleo.github.io/portfolio</p>
</div></body></html>`;

// Served from a git-ignored folder inside the site, so the mask image and
// fonts load same-origin.
const tmp = join(ROOT, 'research/og');
await mkdir(tmp, { recursive: true });
await writeFile(join(tmp, 'card.html'), html);
const server = await startServer();
const browser = await puppeteer.launch({ executablePath: chromePath() });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(`${server.origin}/research/og/card.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  await writeFile(join(ROOT, 'assets/og-image.png'), png);
  console.log(`wrote assets/og-image.png (${png.length} bytes)`);
} finally {
  await browser.close();
  await server.close();
  await rm(tmp, { recursive: true, force: true });
}
