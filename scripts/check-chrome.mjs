// Drift check for the markup every page repeats (no build step to share it).
// Each page wraps its nav, mobile menu and footer in
//   <!-- chrome:NAME:start --> … <!-- chrome:NAME:end -->
// and this script fails if any copy differs from the others once page-specific
// details are normalised:
//   - links resolve to site-root paths ("../blog.html" in posts/, "#about" on
//     the home page and "index.html#about" elsewhere all compare equal)
//   - the current-page marker is ignored (class "active", aria-current="page")
//   - the nav's starting state is ignored ("scrolled" class, data-solid attribute)
//   - whitespace is collapsed
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, listFiles } from './lib/site.mjs';

const BLOCKS = ['nav', 'menu', 'footer'];
const PAGE_STATE_CLASSES = new Set(['active', 'scrolled']);

function canonicalUrl(value, page) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value; // https:, mailto:, …
  const url = new URL(value, `https://site.invalid/${page}`);
  const path = url.pathname.replace(/^\//, '') || 'index.html';
  return path + url.hash.replace(/^#$/, '');
}

function normalise(block, page) {
  return block
    .replace(/\s(href|src)="([^"]*)"/g, (_, attr, v) => ` ${attr}="${canonicalUrl(v, page)}"`)
    .replace(/\sclass="([^"]*)"/g, (_, cls) => {
      const kept = cls.split(/\s+/).filter(c => c && !PAGE_STATE_CLASSES.has(c));
      return kept.length ? ` class="${kept.join(' ')}"` : '';
    })
    .replace(/\s(?:aria-current="page"|data-solid)(?=[\s>])/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

function extract(html, name) {
  const start = `<!-- chrome:${name}:start -->`;
  const end = `<!-- chrome:${name}:end -->`;
  const count = html.split(start).length - 1;
  if (count !== 1 || html.split(end).length - 1 !== 1) return { error: `expected exactly one ${start} … ${end} pair, found ${count}` };
  return { block: html.slice(html.indexOf(start) + start.length, html.indexOf(end)) };
}

const tagLines = s => s.replace(/></g, '>\n<').split('\n');

const pages = await listFiles('.html');
const problems = [];
const reference = {};
for (const page of pages) {
  const html = await readFile(join(ROOT, page), 'utf8');
  for (const name of BLOCKS) {
    const { block, error } = extract(html, name);
    if (error) { problems.push(`${page} [${name}]: ${error}`); continue; }
    const norm = normalise(block, page);
    if (!reference[name]) { reference[name] = { page, norm }; continue; }
    if (norm === reference[name].norm) continue;
    const want = tagLines(reference[name].norm);
    const got = tagLines(norm);
    const missing = want.filter(l => !got.includes(l)).map(l => `    - ${l}`);
    const extra = got.filter(l => !want.includes(l)).map(l => `    + ${l}`);
    const detail = missing.length || extra.length ? [...missing, ...extra] : ['    (same elements, different order)'];
    problems.push(`${page} [${name}] differs from ${reference[name].page}:\n${detail.join('\n')}`);
  }
}

if (problems.length) {
  console.error(`Shared markup drift (${problems.length}):\n\n${problems.join('\n\n')}`);
  process.exit(1);
}
console.log(`nav, menu and footer in sync across ${pages.length} pages`);
