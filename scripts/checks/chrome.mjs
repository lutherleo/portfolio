// Shared nav/footer drift check. The checker itself (scripts/check-chrome.mjs)
// arrives in task 1.1.2; until then this check reports "not set up".
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function run({ root }) {
  const script = join(root, 'scripts', 'check-chrome.mjs');
  if (!existsSync(script)) return { skipped: 'scripts/check-chrome.mjs not written yet (task 1.1.2)' };
  const r = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  return { passed: r.status === 0, output: (r.stdout + r.stderr).trim() };
}
