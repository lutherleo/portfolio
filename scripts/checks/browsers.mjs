// Cross-browser smoke test: key pages in WebKit (Safari's engine) and Firefox
// at desktop and phone widths. Counts uncaught page errors and console errors
// per page/engine/width, and saves a screenshot of each for review in
// research/browsers/. Chromium is already covered by the a11y and Lighthouse
// checks. Errors caused by third-party services outside the site's control
// (config.ignore patterns, e.g. the Medium feed proxy answering 502 without
// CORS headers, which blog.html already handles) are reported but not
// counted. Pages load in the site's default dark scheme unless
// config.colorScheme says otherwise.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../lib/site.mjs';

const VIEWPORTS = [
  { name: '1440', viewport: { width: 1440, height: 900 } },
  { name: '390', viewport: { width: 390, height: 844 }, hasTouch: true },
];

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise(r => setTimeout(r, 100));
    }
    scrollTo(0, 0);
  });
}

export async function run({ origin, config }) {
  const playwright = await import('playwright');
  const ignore = (config.ignore ?? []).map(p => new RegExp(p));
  const counts = {};
  const problems = [];
  for (const engine of config.engines ?? ['webkit', 'firefox']) {
    const browser = await playwright[engine].launch();
    const dir = join(ROOT, 'research/browsers', engine);
    await mkdir(dir, { recursive: true });
    try {
      for (const path of config.pages) {
        for (const vp of VIEWPORTS) {
          const key = `${path}@${engine}@${vp.name}`;
          const context = await browser.newContext({
            viewport: vp.viewport, hasTouch: vp.hasTouch ?? false, colorScheme: config.colorScheme ?? 'dark',
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
          page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()} [${m.location().url}]`); });
          await page.goto(`${origin}/${path}`, { waitUntil: 'load', timeout: 45000 });
          await page.waitForTimeout(1500);
          await scrollThrough(page);
          await page.waitForTimeout(500);
          await page.screenshot({ path: join(dir, `${path.replaceAll('/', '__')}@${vp.name}.png`) });
          const counted = errors.filter(e => !ignore.some(re => re.test(e)));
          counts[key] = counted.length;
          problems.push(...errors.map(e => ({ file: key, rule: ignore.some(re => re.test(e)) ? 'ignored' : 'error', message: e })));
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  return { counts, problems };
}
