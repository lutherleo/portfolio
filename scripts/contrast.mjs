// WCAG contrast check for the colour tokens in style.css, both themes.
// Text tokens need ≥4.5:1 on every background; UI tokens (control edges, focus
// ring) need ≥3:1. Reads the hex values straight from the two token blocks.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './lib/site.mjs';

const css = await readFile(join(ROOT, 'style.css'), 'utf8');
const THEMES = {
  dark: /color-scheme: dark;([\s\S]*?)\n\}/,
  light: /:root\[data-theme="light"\] \{([\s\S]*?)\n\}/,
};
const BACKGROUNDS = ['--bg', '--surface', '--surface-2'];
const TEXT = ['--text', '--text-2', '--text-3', '--accent', '--finding', '--danger', '--warn'];
const UI = ['--border-strong', '--accent'];

function tokens(block) {
  const out = {};
  for (const [, name, hex] of block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)) out[name] = hex;
  return out;
}
function luminance(hex) {
  const h = hex.length === 4 ? [...hex.slice(1)].map(c => c + c).join('') : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const failures = [];
for (const [theme, re] of Object.entries(THEMES)) {
  const block = css.match(re)?.[1];
  if (!block) { failures.push(`${theme}: token block not found`); continue; }
  const t = tokens(block);
  const check = (fg, bg, min) => {
    if (!t[fg] || !t[bg]) return failures.push(`${theme}: missing ${t[fg] ? bg : fg}`);
    const r = ratio(t[fg], t[bg]);
    const line = `${theme.padEnd(6)} ${fg.padEnd(16)} on ${bg.padEnd(12)} ${r.toFixed(2)}:1 (min ${min})`;
    if (r < min) failures.push(line);
    else console.log(`  ok  ${line}`);
  };
  for (const bg of BACKGROUNDS) {
    for (const fg of TEXT) check(fg, bg, 4.5);
    for (const fg of UI) check(fg, bg, 3);
  }
  check('--on-accent', '--accent', 4.5);
  check('--on-accent', '--accent-hover', 4.5);
}

if (failures.length) {
  console.error(`\nContrast failures (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('\nall colour tokens pass WCAG AA in both themes');
