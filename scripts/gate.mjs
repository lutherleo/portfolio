// Quality gate for the static site. Runs the checks, compares them with the
// committed baseline (.quality/baseline.json) and exits 1 on any regression,
// so existing problems are logged but anything new or worse blocks.
//
//   node scripts/gate.mjs                    every check, fail on regressions
//   node scripts/gate.mjs --only=html,css    a subset (html css chrome links a11y browsers lighthouse)
//   node scripts/gate.mjs --write-baseline   record the current state as the baseline
//   node scripts/gate.mjs --ratchet          compare, then lock in improvements if nothing regressed
//   node scripts/gate.mjs --final            release targets from .quality/config.json instead
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, listFiles, startServer } from './lib/site.mjs';

const ALL = ['html', 'css', 'chrome', 'links', 'a11y', 'browsers', 'lighthouse'];
const NEEDS_SERVER = new Set(['links', 'a11y', 'browsers', 'lighthouse']);
const LH_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const only = args.find(a => a.startsWith('--only='));
const selected = only ? only.slice('--only='.length).split(',').filter(Boolean) : ALL;
const unknown = selected.filter(c => !ALL.includes(c));
if (unknown.length) {
  console.error(`Unknown check(s): ${unknown.join(', ')}. Choose from: ${ALL.join(', ')}`);
  process.exit(2);
}
const mode = flag('final') ? 'final' : flag('write-baseline') ? 'write-baseline' : flag('ratchet') ? 'ratchet' : 'compare';

const readJson = async p => JSON.parse(await readFile(p, 'utf8'));
const config = await readJson(join(ROOT, '.quality/config.json'));
const baselinePath = join(ROOT, '.quality/baseline.json');
const baseline = existsSync(baselinePath) ? await readJson(baselinePath) : {};

// ── Run the checks ─────────────────────────────────────────────
const ctx = { root: ROOT, pages: await listFiles('.html'), cssFiles: await listFiles('.css') };
const server = selected.some(c => NEEDS_SERVER.has(c)) ? await startServer() : null;
if (server) ctx.origin = server.origin;

const results = {};
try {
  for (const name of selected) {
    const started = Date.now();
    process.stdout.write(`  ${name.padEnd(11)}`);
    const { run } = await import(`./checks/${name}.mjs`);
    results[name] = await run({ ...ctx, config: config[name] ?? {} });
    console.log(`${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
} finally {
  await server?.close();
}

// ── Compare ────────────────────────────────────────────────────
const sum = counts => Object.values(counts ?? {}).reduce((a, b) => a + b, 0);
const snapshot = name => (name === 'links' ? results.links.broken
  : name === 'lighthouse' ? results.lighthouse.results : results[name].counts);

function judge(name) {
  const r = results[name];
  const base = baseline[name];
  if (name === 'chrome') {
    if (r.skipped) return { status: mode === 'final' ? 'FAIL' : 'SKIP', now: '-', was: '-', notes: [r.skipped] };
    return { status: r.passed ? 'PASS' : 'FAIL', now: r.passed ? 'in sync' : 'drift', was: '-', notes: r.passed ? [] : [r.output] };
  }
  if (name === 'lighthouse') {
    const notes = [];
    const warnings = [];
    for (const [page, now] of Object.entries(r.results)) {
      if (mode === 'final') {
        const t = config.lighthouse.final;
        for (const c of LH_CATEGORIES) if (now[c] < t[c]) notes.push(`${page}: ${c} ${now[c]} < ${t[c]}`);
        if (now.lcpMs > t.lcpMs) notes.push(`${page}: LCP ${now.lcpMs}ms > ${t.lcpMs}ms`);
        if (now.cls > t.cls) notes.push(`${page}: CLS ${now.cls} > ${t.cls}`);
      } else if (base?.[page]) {
        // A page may dip while it stays at or above the release target; below
        // target it may not get more than `tolerance` points worse than baseline.
        // Local performance scores swing ~±10 between identical runs (third-party
        // fonts/CDNs, machine load), so performance only warns here and is
        // enforced by --final; the other categories are stable and block.
        for (const c of LH_CATEGORIES) {
          const limit = Math.min(base[page][c] - config.lighthouse.tolerance, config.lighthouse.final[c]);
          if (now[c] >= limit) continue;
          (c === 'performance' ? warnings : notes).push(`${page}: ${c} ${base[page][c]} → ${now[c]} (limit ${limit})`);
        }
      }
    }
    notes.push(...warnings.map(w => `warning: ${w}`));
    const failing = notes.length - warnings.length;
    const avg = o => Math.round(Object.values(o ?? {}).reduce((a, p) => a + p.performance, 0) / Math.max(1, Object.keys(o ?? {}).length));
    const status = failing ? 'FAIL' : warnings.length ? 'WARN' : 'PASS';
    return { status, now: `perf avg ${avg(r.results)}`, was: base ? `perf avg ${avg(base)}` : '-', notes };
  }
  if (name === 'links') {
    // Files only the site owner can supply (config.links.waitingOnOwner) warn
    // instead of failing, so linking to them doesn't block other work; --final
    // still fails on them.
    const was = new Set(base ?? []);
    const owner = config.links?.waitingOnOwner ?? [];
    const waiting = b => owner.some(f => b.includes(`-> ${f} (`));
    if (mode === 'final') return { status: r.broken.length ? 'FAIL' : 'PASS', now: r.broken.length, was: '-', notes: r.broken };
    const failing = r.broken.filter(b => !was.has(b) && !waiting(b)).map(b => `new: ${b}`);
    const warnings = r.broken.filter(waiting).map(b => `warning: waiting on owner: ${b}`);
    const status = failing.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS';
    return { status, now: r.broken.length, was: base ? base.length : '-', notes: [...failing, ...warnings] };
  }
  // html, css, a11y, browsers: per-file counts may not rise (or must be 0 for --final).
  const notes = [];
  for (const [key, n] of Object.entries(r.counts)) {
    const limit = mode === 'final' ? 0 : (base?.[key] ?? 0);
    if (n > limit) notes.push(`${key}: ${mode === 'final' ? '' : `${base?.[key] ?? 0} → `}${n}`);
  }
  return { status: notes.length ? 'FAIL' : 'PASS', now: sum(r.counts), was: base ? sum(base) : '-', notes };
}

const verdicts = Object.fromEntries(selected.map(n => [n, mode === 'write-baseline'
  ? { status: 'RECORDED', now: summaryOf(n), was: '-', notes: [] }
  : judge(n)]));

function summaryOf(n) {
  if (n === 'chrome') return results.chrome.skipped ? 'not set up' : results.chrome.passed ? 'in sync' : 'drift';
  if (n === 'links') return results.links.broken.length;
  if (n === 'lighthouse') return `${Object.keys(results.lighthouse.results).length} pages`;
  return sum(results[n].counts);
}

// ── Report ─────────────────────────────────────────────────────
console.log(`\n  mode: ${mode}${mode === 'compare' || mode === 'ratchet' ? ' (vs .quality/baseline.json)' : ''}`);
console.log(`  ${'check'.padEnd(11)}${'status'.padEnd(10)}${'now'.padEnd(16)}baseline`);
for (const [n, v] of Object.entries(verdicts)) {
  console.log(`  ${n.padEnd(11)}${v.status.padEnd(10)}${String(v.now).padEnd(16)}${v.was}`);
}
for (const [n, v] of Object.entries(verdicts)) {
  if (!v.notes.length) continue;
  console.log(`\n  ${n}:`);
  for (const line of v.notes.slice(0, 20)) console.log(`    ${line}`);
  if (v.notes.length > 20) console.log(`    … ${v.notes.length - 20} more`);
}
if (results.lighthouse) {
  const w = Math.max(20, ...Object.keys(results.lighthouse.results).map(p => p.length)) + 2;
  console.log(`\n  ${'lighthouse (mobile)'.padEnd(w)}perf  a11y  bp   seo   LCP      CLS`);
  for (const [p, s] of Object.entries(results.lighthouse.results)) {
    console.log(`  ${p.padEnd(w)}${String(s.performance).padEnd(6)}${String(s.accessibility).padEnd(6)}${String(s['best-practices']).padEnd(5)}${String(s.seo).padEnd(6)}${String(s.lcpMs + 'ms').padEnd(9)}${s.cls}`);
  }
}

await mkdir(join(ROOT, '.quality'), { recursive: true });
await writeFile(join(ROOT, '.quality/last-run.json'), JSON.stringify({ mode, at: new Date().toISOString(), results }, null, 2));

const failed = Object.values(verdicts).some(v => v.status === 'FAIL');
if (mode === 'write-baseline' || (mode === 'ratchet' && !failed)) {
  const next = { ...baseline, updatedAt: new Date().toISOString() };
  for (const n of selected) if (n !== 'chrome') next[n] = snapshot(n);
  await writeFile(baselinePath, JSON.stringify(next, null, 2) + '\n');
  console.log(`\n  baseline updated: .quality/baseline.json (${selected.filter(n => n !== 'chrome').join(', ')})`);
  if (mode === 'write-baseline' && selected.length === ALL.length) await writeReport(join(ROOT, 'research/baseline.md'));
}
console.log(failed ? '\n  ✗ gate failed' : '\n  ✓ gate passed');
process.exit(failed ? 1 : 0);

// ── Human-readable baseline report ─────────────────────────────
async function writeReport(path) {
  const top = (problems, n = 12) => Object.entries(problems.reduce((m, p) => ((m[p.rule] = (m[p.rule] ?? 0) + (p.nodes ?? 1)), m), {}))
    .sort((a, b) => b[1] - a[1]).slice(0, n);
  const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');
  const out = [
    `# Quality baseline`,
    ``,
    `Recorded ${new Date().toISOString()} by \`npm run check:baseline\`, before any redesign work (task 1.1.1). ` +
      `The gate fails when a file gets worse than this; \`npm run check:ratchet\` locks in improvements.`,
    ``,
    table(['Check', 'Total now'], selected.map(n => [n, String(summaryOf(n))])),
  ];
  for (const n of ['html', 'css']) {
    if (!results[n]) continue;
    out.push('', `## ${n === 'html' ? 'HTML validation (html-validate)' : 'CSS lint (stylelint)'}`, '',
      table(['File', 'Problems'], Object.entries(results[n].counts).map(([f, c]) => [f, String(c)])), '',
      'Most common rules:', '', table(['Rule', 'Count'], top(results[n].problems).map(([r, c]) => [`\`${r}\``, String(c)])));
  }
  if (results.links) {
    out.push('', '## Broken internal links', '', ...(results.links.broken.length ? results.links.broken.map(b => `- \`${b}\``) : ['None.']));
  }
  if (results.a11y) {
    const help = Object.fromEntries(results.a11y.problems.map(p => [p.rule, `${p.help} (${p.impact})`]));
    out.push('', '## Accessibility (axe-core, WCAG 2.2 AA tags)', '',
      table(['Page @ scheme', 'Violating nodes'], Object.entries(results.a11y.counts).map(([f, c]) => [f, String(c)])), '',
      'Most common rules:', '', table(['Rule', 'Nodes', 'What it means'], top(results.a11y.problems).map(([r, c]) => [`\`${r}\``, String(c), help[r]])));
  }
  if (results.lighthouse) {
    out.push('', '## Lighthouse (mobile, simulated throttling)', '',
      table(['Page', 'Perf', 'A11y', 'Best pr.', 'SEO', 'LCP', 'CLS', 'TBT'],
        Object.entries(results.lighthouse.results).map(([p, s]) =>
          [p, s.performance, s.accessibility, s['best-practices'], s.seo, `${s.lcpMs} ms`, s.cls, `${s.tbtMs} ms`].map(String))));
  }
  if (results.chrome) out.push('', '## Nav/footer drift', '', summaryOf('chrome') === 'not set up' ? results.chrome.skipped : summaryOf('chrome'));
  await mkdir(join(ROOT, 'research'), { recursive: true });
  await writeFile(path, out.join('\n') + '\n');
  console.log(`  report written: research/baseline.md`);
}
