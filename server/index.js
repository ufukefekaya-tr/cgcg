// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

export function startServer(options = {}) {
  const config = { ...loadConfig(), ...options };
  const app = createApp(config);
  const server = app.listen(config.port, config.host, () => {
    console.log(`CGCG is available at http://${config.host}:${server.address().port}`);
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.on('error', () => app.locals.close());
  server.on('close', () => app.locals.close());
  return { app, server };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server } = startServer();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
}
