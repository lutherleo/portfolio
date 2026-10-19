// Broken internal links and #fragments with linkinator. External links are
// skipped so results don't depend on third-party sites being up.
import { LinkChecker } from 'linkinator';

export async function run({ origin, pages }) {
  const rel = url => (url ?? '').replace(origin + '/', '').replace(origin, '') || '/';
  const result = await new LinkChecker().check({
    path: pages.map(p => `${origin}/${p}`),
    recurse: true,
    checkFragments: true,
    checkCss: true,
    concurrency: 8,
    linksToSkip: async link => !link.startsWith(origin),
  });
  const counts = {};
  const broken = [];
  for (const link of result.links) {
    if (link.state !== 'BROKEN') continue;
    const page = rel(link.parent);
    counts[page] = (counts[page] ?? 0) + 1;
    broken.push(`${page} -> ${rel(link.url)} (${link.status ?? 'error'})`);
  }
  return { counts, broken: [...new Set(broken)].sort() };
}
