// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import path from 'node:path';

function integer(value, fallback, min, max, name) {
  if (value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) throw new Error(`${name} must be between ${min} and ${max}`);
  return number;
}

export function loadConfig(env = process.env) {
  const port = integer(env.PORT, 4310, 1, 65535, 'PORT');
  return {
    host: env.CGCG_HOST || '127.0.0.1', port,
    dataDir: path.resolve(env.CGCG_DATA_DIR || '.data'),
    allowedOrigins: env.CGCG_ALLOWED_ORIGINS ? env.CGCG_ALLOWED_ORIGINS.split(',').map(value => value.trim()).filter(Boolean) :
      [`http://127.0.0.1:${port}`, `http://localhost:${port}`, 'http://127.0.0.1:5175', 'http://localhost:5175'],
    aiEnabled: env.CGCG_AI_ENABLED === 'true',
    aiModel: env.CGCG_AI_MODEL || '',
    aiApiKey: env.GEMINI_API_KEY || '',
    rateLimit: integer(env.CGCG_RATE_LIMIT, 600, 1, 10000, 'CGCG_RATE_LIMIT'),
  };
}

export const LIMITS = Object.freeze({
  jsonBytes: 1024 * 1024, gcodeBytes: 512 * 1024, gcodeLines: 10000,
  files: 100, totalFileBytes: 25 * 1024 * 1024, records: 200,
});
