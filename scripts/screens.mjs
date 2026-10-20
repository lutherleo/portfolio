// Full-page screenshots of every page for before/after comparisons.
//   node scripts/screens.mjs <label> [--scheme=dark|light] [--pages=index.html,blog.html]
// Writes research/screens/<label>/<page>@<width>.png (research/ is git-ignored).
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { ROOT, chromePath, listFiles, startServer } from './lib/site.mjs';

const args = process.argv.slice(2);
const label = args.find(a => !a.startsWith('--'));
if (!label) {
  console.error('usage: node scripts/screens.mjs <label> [--scheme=dark|light] [--pages=a.html,b.html]');
  process.exit(2);
}
const opt = name => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const scheme = opt('scheme') ?? 'dark';
const pages = opt('pages')?.split(',') ?? await listFiles('.html');
const widths = [375, 1440];

const outDir = join(ROOT, 'research', 'screens', label);
await mkdir(outDir, { recursive: true });
const server = await startServer();
const browser = await puppeteer.launch({ executablePath: chromePath(), args: process.env.CI ? ['--no-sandbox'] : [] });
try {
  for (const path of pages) {
    for (const width of widths) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
      await page.goto(`${server.origin}/${path}`, { waitUntil: 'networkidle2', timeout: 45000 });
      // Scroll through so scroll-revealed content is visible, then settle.
      await page.evaluate(async () => {
        const step = Math.floor(innerHeight * 0.6);
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          scrollTo(0, y);
          await new Promise(r => setTimeout(r, 160));
        }
        scrollTo(0, 0);
      });
      await new Promise(r => setTimeout(r, 1500));
      await page.addStyleTag({ content: '*, *::before, *::after { animation-play-state: paused !important; }' });
      const file = join(outDir, `${path.replace(/\//g, '__')}@${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`screenshots: research/screens/${label}/ (${pages.length} pages × ${widths.join(', ')}px, ${scheme})`);
