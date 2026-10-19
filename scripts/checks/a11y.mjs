// WCAG 2.2 AA checks with axe-core in headless Chrome, once per colour scheme.
// Each page gets a fresh browser context (always a first visit), is scrolled
// top to bottom so scroll-revealed content is tested, and finite animations
// are allowed to finish, then all animation is frozen, so half-faded
// elements never skew contrast results.
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
import { chromePath } from '../lib/site.mjs';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    scrollTo(0, 0);
  });
  await page.evaluate(() => Promise.race([
    Promise.all(document.getAnimations()
      .filter(a => a.effect?.getTiming().iterations !== Infinity)
      .map(a => a.finished.catch(() => {}))),
    new Promise(r => setTimeout(r, 6000)),
  ]));
  // Looping animations (pulsing dots, blinking carets) never finish; freeze
  // everything at its resting style so contrast is measured the same way every run.
  await page.addStyleTag({
    content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
  });
}

export async function run({ origin, pages, config }) {
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    args: process.env.CI ? ['--no-sandbox'] : [],
  });
  const counts = {};
  const problems = [];
  try {
    for (const scheme of config.colorSchemes) {
      for (const path of pages) {
        const key = `${path}@${scheme}`;
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
        await page.goto(`${origin}/${path}`, { waitUntil: 'networkidle2', timeout: 45000 });
        await scrollThrough(page);
        await page.addScriptTag({ path: axePath });
        const violations = await page.evaluate(
          tags => window.axe.run(document, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] })
            .then(r => r.violations.map(v => ({ rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }))),
          config.tags,
        );
        counts[key] = violations.reduce((n, v) => n + v.nodes, 0);
        problems.push(...violations.map(v => ({ file: key, ...v })));
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  return { counts, problems };
}
