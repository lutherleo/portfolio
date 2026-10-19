// CSS linting with stylelint (config: .stylelintrc.json).
import { join, relative, sep } from 'node:path';
import stylelint from 'stylelint';

export async function run({ root, cssFiles }) {
  const { results } = await stylelint.lint({ files: cssFiles.map(f => join(root, f)), cwd: root });
  const counts = {};
  const problems = [];
  for (const r of results) {
    const file = relative(root, r.source).split(sep).join('/');
    const issues = [
      ...r.warnings.map(w => ({ line: w.line, rule: w.rule, message: w.text })),
      ...(r.parseErrors ?? []).map(e => ({ line: e.line, rule: 'parse-error', message: e.text })),
    ];
    counts[file] = issues.length;
    problems.push(...issues.map(i => ({ file, ...i })));
  }
  return { counts, problems };
}
