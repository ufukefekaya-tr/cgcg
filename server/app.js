// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { engine, inject } from './engine/index.js';
import { DEMO_PROFILE, DEMO_REQUEST } from './engine/defaults.js';
import { normalizeGenerationRequest, normalizeMachineProfile, normalizeInjectionRequest } from './engine/validateInput.js';
import { createStore } from './store.js';
import { loadConfig, LIMITS } from './config.js';
import { ApiError, exactKeys, object, text, gcodeText, filename, identifier } from './validation.js';
import { createVisionProvider, normalizeVisionRequest } from './ai.js';

const asyncRoute = handler => (req, res, next) => Promise.resolve().then(() => handler(req, res)).catch(next);
const success = (res, data, status = 200) => res.status(status).json({ success: true, data });

function rateLimiter(limit) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now(), key = req.socket.remoteAddress || 'unknown';
    let current = clients.get(key);
    if (!current || current.until <= now) {
      if (clients.size >= 1024) for (const [id, record] of clients) if (record.until <= now) clients.delete(id);
      if (clients.size >= 1024 && !clients.has(key)) return next(new ApiError(429, 'RATE_LIMITED', 'Request capacity reached'));
      current = { count: 0, until: now + 60000 }; clients.set(key, current);
    }
    if (++current.count > limit) { res.set('Retry-After', String(Math.ceil((current.until - now) / 1000))); return next(new ApiError(429, 'RATE_LIMITED', 'Too many requests')); }
    next();
  };
}

function profileBody(raw) {
  const body = { ...object(raw) };
  delete body.id; delete body.created_at; delete body.updated_at;
  const profile = normalizeMachineProfile(body);
  return { ...profile, name: text(profile.name, 'Profile name') };
}

/** Construct a testable app without starting a listener or contacting providers. */
export function createApp(options = {}) {
  const config = { ...loadConfig(), ...options };
  if (!Array.isArray(config.allowedOrigins) || config.allowedOrigins.some(origin => typeof origin !== 'string' || !/^https?:\/\/[^/]+$/u.test(origin) || origin.includes('*'))) throw new Error('Configure explicit HTTP(S) origins');
  const store = options.store || createStore({ filename: options.dbPath || path.join(config.dataDir, 'cgcg.sqlite'), seedProfile: options.seed === false ? undefined : DEMO_PROFILE });
  const app = express();
  app.disable('x-powered-by');
  app.locals.store = store;
  let closed = false;
  app.locals.close = () => { if (!closed) { closed = true; store.close(); } };
  app.use(helmet());
  // Check Origin before body/multipart parsing: CORS alone would not prevent a
  // browser from submitting a cross-origin form with local persistent effects.
  app.use('/api', (req, _res, next) => {
    const origin = req.get('Origin');
    if ((origin && !config.allowedOrigins.includes(origin)) || (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Sec-Fetch-Site') === 'cross-site')) return next(new ApiError(403, 'ORIGIN_DENIED', 'Origin is not allowed'));
    next();
  });
  app.use(cors({ origin(origin, callback) { callback(null, !origin || config.allowedOrigins.includes(origin)); } }));
  app.use('/api', rateLimiter(config.rateLimit));
  app.use(express.json({ limit: LIMITS.jsonBytes, strict: true }));

  app.get('/api/health', (_req, res) => success(res, { status: 'ok', aiEnabled: Boolean(config.aiEnabled), limits: LIMITS }));
  app.get('/api/examples', (_req, res) => success(res, { machineProfile: DEMO_PROFILE, request: DEMO_REQUEST }));

  app.post('/api/gcode/generate', asyncRoute((req, res) => {
    const request = normalizeGenerationRequest(object(req.body));
    const result = engine.generate(request);
    gcodeText(result.gcode);
    success(res, result);
  }));
  app.post('/api/gcode/parse', asyncRoute((req, res) => {
    object(req.body); exactKeys(req.body, ['gcode'], 'parse');
    const ast = engine.parse(gcodeText(req.body.gcode));
    success(res, { ast, stats: {
      lineCount: ast.length, motionCount: ast.filter(line => line.type === 'motion').length,
      rapidCount: ast.filter(line => (line.gCodes || []).some(code => /^G0?0$/u.test(code))).length,
      dwellCount: ast.filter(line => (line.gCodes || []).some(code => /^G0?4$/u.test(code))).length,
    } });
  }));
  app.post('/api/gcode/validate', asyncRoute((req, res) => {
    object(req.body); exactKeys(req.body, ['gcode', 'machineProfile'], 'validate');
    success(res, engine.validate(gcodeText(req.body.gcode), normalizeMachineProfile(req.body.machineProfile)));
  }));
  app.post('/api/gcode/inject', asyncRoute((req, res) => {
    object(req.body); gcodeText(req.body.gcode);
    const normalized = normalizeInjectionRequest(req.body);
    const result = inject(normalized.gcode, normalized.rule, normalized.machineProfile, { use2AxisOnly: normalized.use2AxisOnly });
    gcodeText(result.gcode);
    success(res, result);
  }));

  app.get('/api/machines', (_req, res) => success(res, store.list('machines')));
  app.get('/api/machines/:id', asyncRoute((req, res) => {
    const value = store.get('machines', identifier(req.params.id));
    if (!value) throw new ApiError(404, 'NOT_FOUND', 'Machine profile not found');
    success(res, value);
  }));
  app.post('/api/machines', asyncRoute((req, res) => success(res, store.save('machines', profileBody(req.body)), 201)));
  app.put('/api/machines/:id', asyncRoute((req, res) => success(res, store.save('machines', profileBody(req.body), identifier(req.params.id), true))));
  app.delete('/api/machines/:id', asyncRoute((req, res) => {
    if (!store.delete('machines', identifier(req.params.id))) throw new ApiError(404, 'NOT_FOUND', 'Machine profile not found');
    success(res, { success: true });
  }));

  function presetBody(raw) {
    object(raw); exactKeys(raw, ['name', 'config', 'id', 'created_at', 'updated_at'], 'preset');
    const name = text(raw.name, 'Preset name');
    const input = object(raw.config, 'Preset configuration');
    // Geometry-only presets may be reused with a separately selected machine.
    // Validate them against a synthetic envelope, and retain their absence of a
    // machine profile rather than choosing a physical controller implicitly.
    const hasProfile = input.machineProfile !== undefined;
    const config = normalizeGenerationRequest({ ...input, machineProfile: hasProfile ? input.machineProfile : DEMO_PROFILE });
    if (!hasProfile) delete config.machineProfile;
    return { name, config };
  }
  app.get('/api/presets', (_req, res) => success(res, store.list('presets')));
  app.get('/api/presets/:id', asyncRoute((req, res) => {
    const value = store.get('presets', identifier(req.params.id));
    if (!value) throw new ApiError(404, 'NOT_FOUND', 'Preset not found');
    success(res, value);
  }));
  app.post('/api/presets', asyncRoute((req, res) => success(res, store.save('presets', presetBody(req.body)), 201)));
  app.put('/api/presets/:id', asyncRoute((req, res) => success(res, store.save('presets', presetBody(req.body), identifier(req.params.id), true))));
  app.delete('/api/presets/:id', asyncRoute((req, res) => {
    if (!store.delete('presets', identifier(req.params.id))) throw new ApiError(404, 'NOT_FOUND', 'Preset not found');
    success(res, { success: true });
  }));

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMITS.gcodeBytes, files: 1, fields: 0, parts: 2 } }).single('file');
  const uploadMiddleware = (req, res, next) => req.is('multipart/form-data') ? upload(req, res, next) : next();
  function addFile(req, res) {
    let name, content;
    if (req.file) {
      name = filename(req.file.originalname);
      const raw = req.file.buffer;
      content = raw.toString('utf8');
      if (!Buffer.from(content, 'utf8').equals(raw)) throw new ApiError(415, 'UNSUPPORTED_FORMAT', 'Upload must be UTF-8 text');
    } else {
      const body = object(req.body);
      exactKeys(body, ['name', 'content', 'filename', 'gcode'], 'file');
      if ((body.name !== undefined && body.filename !== undefined) || (body.content !== undefined && body.gcode !== undefined)) throw new ApiError(400, 'INVALID_INPUT', 'Use one filename and one content field');
      name = filename(body.name ?? body.filename); content = body.content ?? body.gcode;
    }
    success(res, store.addFile(name, gcodeText(content)), 201);
  }
  app.post(['/api/files', '/api/files/upload'], uploadMiddleware, asyncRoute(addFile));
  app.get('/api/files', (_req, res) => success(res, store.listFiles()));
  app.get('/api/files/download/:id', asyncRoute((req, res) => {
    const record = store.getFile(identifier(req.params.id));
    if (!record) throw new ApiError(404, 'NOT_FOUND', 'File not found');
    res.type('text/plain').attachment(record.filename).set('X-Content-Type-Options', 'nosniff').send(record.content);
  }));
  app.get('/api/files/:id', asyncRoute((req, res) => {
    const record = store.getFile(identifier(req.params.id));
    if (!record) throw new ApiError(404, 'NOT_FOUND', 'File not found');
    success(res, record);
  }));
  app.delete('/api/files/:id', asyncRoute((req, res) => {
    if (!store.deleteFile(identifier(req.params.id))) throw new ApiError(404, 'NOT_FOUND', 'File not found');
    success(res, { success: true });
  }));

  const aiProvider = options.aiProvider || (config.aiEnabled ? createVisionProvider(config) : null);
  app.post('/api/vision/chat', asyncRoute(async (req, res) => {
    if (!config.aiEnabled) throw new ApiError(503, 'AI_DISABLED', 'AI is disabled; local G-code tools remain available');
    if (!aiProvider) throw new ApiError(503, 'AI_NOT_CONFIGURED', 'Explicit AI credentials and model configuration are required');
    const input = normalizeVisionRequest(req.body);
    success(res, await aiProvider(input));
  }));

  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'API route not found')));
  const staticDir = config.staticDir === false ? null : path.resolve(config.staticDir || fileURLToPath(new URL('../dist', import.meta.url)));
  if (staticDir && fs.existsSync(path.join(staticDir, 'index.html'))) {
    app.use(express.static(staticDir, { dotfiles: 'deny', index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }
  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError) error = new ApiError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, error.code, 'Upload limit or field constraint exceeded');
    if (error.type === 'entity.too.large') error = new ApiError(413, 'LIMIT_EXCEEDED', 'Request body exceeds 1 MiB');
    else if (error instanceof SyntaxError && 'body' in error) error = new ApiError(400, 'INVALID_JSON', 'Malformed JSON request');
    // Input normalization errors contain only field paths and validation text.
    if (error.name === 'InputValidationError') error = new ApiError(400, 'INVALID_INPUT', error.message);
    const status = error instanceof ApiError ? error.status : 500;
    res.status(status).json({ success: false, error: { code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR', message: status === 500 ? 'The request could not be completed' : error.message } });
  });
  return app;
}
