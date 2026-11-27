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

// Graceful shutdown. Railway (and Docker) send SIGTERM when a deployment is
// replaced. Stop accepting connections, let in-flight requests finish, close
// the SQLite database (which checkpoints the WAL), then exit 0. A stop signal
// is a normal stop, never a crash: every path here exits 0, including the
// 5-second force-exit if something hangs.
const FORCE_EXIT_MS = 5_000;
let stopping = false;
const stop = (signal: NodeJS.Signals) => {
  if (stopping) return;
  stopping = true;
  process.stdout.write(`${signal} received, shutting down\n`);
  const force = setTimeout(() => {
    process.stderr.write(`Shutdown took longer than ${FORCE_EXIT_MS / 1000}s, exiting\n`);
    process.exit(0);
  }, FORCE_EXIT_MS);
  force.unref();
  server.close(() => {
    try {
      app.close();
      if (app.db.isOpen) app.db.close();
    } catch (e) {
      process.stderr.write(`Error closing database: ${e instanceof Error ? e.message : String(e)}\n`);
    }
    clearTimeout(force);
    process.exit(0);
  });
  server.closeIdleConnections();
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
