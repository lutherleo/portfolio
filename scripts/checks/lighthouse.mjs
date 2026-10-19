// Lighthouse (mobile preset, simulated throttling) for every page.
// With runs > 1 the run with the median performance score is kept.
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromePath } from '../lib/site.mjs';

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

function summarise(lhr) {
  const scores = Object.fromEntries(CATEGORIES.map(c => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]));
  const audit = id => lhr.audits[id]?.numericValue ?? null;
  return {
    ...scores,
    lcpMs: Math.round(audit('largest-contentful-paint')),
    cls: Math.round(audit('cumulative-layout-shift') * 1000) / 1000,
    tbtMs: Math.round(audit('total-blocking-time')),
  };
}

export async function run({ origin, pages, config }) {
  const chrome = await chromeLauncher.launch({
    chromePath: chromePath(),
    chromeFlags: ['--headless=new', ...(process.env.CI ? ['--no-sandbox'] : [])],
  });
  const results = {};
  try {
    for (const path of pages) {
      const runs = [];
      for (let i = 0; i < config.runs; i++) {
        const { lhr } = await lighthouse(`${origin}/${path}`, {
          port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: CATEGORIES,
        });
        runs.push(summarise(lhr));
      }
      runs.sort((a, b) => a.performance - b.performance);
      results[path] = runs[Math.floor(runs.length / 2)];
    }
  } finally {
    await chrome.kill();
  }
  return { results };
}
