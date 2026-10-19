// HTML validation with html-validate (config: .htmlvalidate.json).
import { join } from 'node:path';
import { FileSystemConfigLoader, HtmlValidate } from 'html-validate';

export async function run({ root, pages }) {
  const validator = new HtmlValidate(new FileSystemConfigLoader());
  const counts = {};
  const problems = [];
  for (const page of pages) {
    const report = await validator.validateFile(join(root, page));
    const messages = report.results.flatMap(r => r.messages);
    counts[page] = messages.length;
    for (const m of messages) {
      problems.push({ file: page, line: m.line, rule: m.ruleId, message: m.message });
    }
  }
  return { counts, problems };
}
