import { createServer } from 'node:http';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

let cfg;
try {
  cfg = loadConfig();
} catch (e) {
  process.stderr.write(`Configuration error: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}

const app = createApp(cfg);
const server = createServer(app.handle);
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(cfg.port, cfg.host, () => {
  process.stdout.write(`Spam Patterns listening on http://${cfg.host}:${cfg.port} (mode: ${cfg.intakeMode})\n`);
});

const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
