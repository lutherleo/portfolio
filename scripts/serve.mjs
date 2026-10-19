// Serve the site locally: `npm run serve` (PORT defaults to 8080).
import { startServer } from './lib/site.mjs';

const { origin } = await startServer(Number(process.env.PORT ?? 8080));
console.log(`Serving the portfolio at ${origin}/  (Ctrl+C to stop)`);
