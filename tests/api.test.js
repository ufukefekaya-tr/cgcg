// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';
import { loadConfig, LIMITS } from '../server/config.js';
import { DEMO_PROFILE, DEMO_REQUEST } from '../server/engine/defaults.js';

async function fixture(t, options = {}) {
  const app = createApp({ dbPath: ':memory:', staticDir: false, aiEnabled: false, aiApiKey: '', aiModel: '', rateLimit: 1000, ...options });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    app.locals.close();
  });
  async function request(route, body, method = body === undefined ? 'GET' : 'POST', headers = {}) {
    const response = await fetch(url + route, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  return { app, url, request };
}

test('factory starts no listener and exposes only synthetic examples/default state', async t => {
  const { request } = await fixture(t);
  assert.equal(loadConfig({}).host, '127.0.0.1');
  assert.equal(loadConfig({}).port, 4310);
  assert.equal(loadConfig({}).aiEnabled, false);
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.data.aiEnabled, false);
  const examples = await request('/api/examples');
  assert.equal(examples.body.data.machineProfile.controllerType, 'generic');
  const machines = await request('/api/machines');
  assert.equal(machines.body.data.length, 1);
  assert.equal(machines.body.data[0].id, 'demo-millimetre');
  assert.deepEqual((await request('/api/presets')).body.data, []);
  assert.deepEqual((await request('/api/files')).body.data, []);
});

test('generate, parse, inspect and inject operate on explicit synthetic profiles', async t => {
  const { request } = await fixture(t);
  const generated = await request('/api/gcode/generate', structuredClone(DEMO_REQUEST));
  assert.equal(generated.status, 200, JSON.stringify(generated.body));
  const gcode = generated.body.data.gcode;
  assert.ok(gcode.includes('G90'));
  assert.doesNotMatch(gcode, /\bZ[+-]?\d/u);
  const parsed = await request('/api/gcode/parse', { gcode });
  assert.equal(parsed.status, 200);
  assert.ok(parsed.body.data.stats.lineCount > 5);
  const validated = await request('/api/gcode/validate', { gcode, machineProfile: DEMO_PROFILE });
  assert.equal(validated.status, 200);
  assert.ok(Array.isArray(validated.body.data.issues));
  const modified = await request('/api/gcode/inject', { gcode: 'G90\nG1 X10 Y10 F100\nM30', machineProfile: DEMO_PROFILE, injection: { type: 'changeFeedrate', params: { feedRate: 600 } } });
  assert.equal(modified.status, 200, JSON.stringify(modified.body));
  assert.match(modified.body.data.gcode, /F600/u);
  assert.equal(modified.body.data.changeCount, 1);
});

test('deep malformed geometry, controller, command and expansion requests fail as client errors', async t => {
  const { request } = await fixture(t);
  for (const change of [
    value => { value.machineProfile.controllerType = 'unverified-controller'; },
    value => { value.machineProfile.mCodes.pourOn = 'M04\nM30'; },
    value => { value.geometry.width = null; },
    value => { value.geometry.gridRows = 10000; },
    value => { value.geometry.startX = -1; },
    value => { value.process.feedRate = '1000'; },
    value => { value.process.use2AxisOnly = 'true'; },
  ]) {
    const value = structuredClone(DEMO_REQUEST); change(value);
    const result = await request('/api/gcode/generate', value);
    assert.equal(result.status, 400, JSON.stringify(result.body));
    assert.equal(result.body.success, false);
  }
  assert.equal((await request('/api/gcode/generate', [])).status, 400);
  assert.equal((await request('/api/gcode/parse', { gcode: 'x'.repeat(LIMITS.gcodeBytes + 1) })).status, 413);
  assert.equal((await request('/api/gcode/inject', { gcode: 'G1 X2', machineProfile: DEMO_PROFILE, injection: { type: 'insertSafeZ' } })).status, 400);
});

test('profiles and presets persist validated canonical records and enforce CRUD uniqueness', async t => {
  const { request } = await fixture(t);
  const profile = { ...structuredClone(DEMO_PROFILE), name: 'Synthetic alternate envelope' };
  const created = await request('/api/machines', profile);
  assert.equal(created.status, 201);
  assert.notEqual(created.body.data.id, 'demo-millimetre');
  const id = created.body.data.id;
  assert.equal((await request('/api/machines', profile)).status, 409);
  const updated = await request(`/api/machines/${id}`, { ...created.body.data, name: 'Edited synthetic envelope' }, 'PUT');
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.name, 'Edited synthetic envelope');
  assert.equal((await request(`/api/machines/${id}`)).body.data.name, 'Edited synthetic envelope');
  const preset = await request('/api/presets', { name: 'Synthetic grid draft', config: DEMO_REQUEST });
  assert.equal(preset.status, 201, JSON.stringify(preset.body));
  const presetId = preset.body.data.id;
  assert.equal((await request(`/api/presets/${presetId}`)).status, 200);
  assert.equal((await request(`/api/presets/${presetId}`, { name: 'Edited grid draft', config: DEMO_REQUEST }, 'PUT')).status, 200);
  assert.equal((await request(`/api/presets/${presetId}`, undefined, 'DELETE')).status, 200);
  assert.equal((await request(`/api/presets/${presetId}`)).status, 404);
  assert.equal((await request(`/api/machines/${id}`, undefined, 'DELETE')).status, 200);
  assert.equal((await request(`/api/machines/${id}`, undefined, 'DELETE')).status, 404);
});

test('text files are bounded database records, with no caller-supplied disk paths', async t => {
  const { request, url } = await fixture(t);
  const created = await request('/api/files', { name: 'synthetic draft.nc', content: 'G90\nG1 X10 F100\nM30' });
  assert.equal(created.status, 201);
  const record = created.body.data;
  assert.equal(record.filename, 'synthetic draft.nc');
  assert.equal('disk_path' in record, false);
  assert.equal((await request(`/api/files/${record.id}`)).body.data.content, record.content);
  const attachment = await fetch(`${url}/api/files/download/${record.id}`);
  assert.equal(attachment.status, 200);
  assert.match(attachment.headers.get('content-disposition'), /^attachment/u);
  assert.equal(attachment.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await attachment.text(), record.content);
  for (const name of ['../../private.nc', '..\\private.nc', 'hidden.exe', '.env']) assert.equal((await request('/api/files', { name, content: 'G1 X1' })).status, 400);
  assert.equal((await request('/api/files', { name: 'bad.nc', content: 'G1\0X1' })).status, 400);
  const form = new FormData(); form.set('file', new Blob(['G90\nG1 X20\nM30'], { type: 'text/plain' }), 'multipart.nc');
  const uploaded = await fetch(`${url}/api/files/upload`, { method: 'POST', body: form });
  assert.equal(uploaded.status, 201, await uploaded.text());
  const binary = new FormData(); binary.set('file', new Blob([Buffer.from([255, 254, 0])]), 'binary.nc');
  assert.equal((await fetch(`${url}/api/files/upload`, { method: 'POST', body: binary })).status, 415);
  assert.equal((await request(`/api/files/${record.id}`, undefined, 'DELETE')).status, 200);
  assert.equal((await request(`/api/files/${record.id}`)).status, 404);
});

test('cross-site JSON and multipart mutation are rejected before persistent effects', async t => {
  const { request, url } = await fixture(t);
  const headers = { Origin: 'https://untrusted.invalid' };
  assert.equal((await request('/api/files', { name: 'cross-site.nc', content: 'G1 X1' }, 'POST', headers)).status, 403);
  const form = new FormData(); form.set('file', new Blob(['G1 X1']), 'cross-site.nc');
  assert.equal((await fetch(url + '/api/files/upload', { method: 'POST', headers, body: form })).status, 403);
  assert.deepEqual((await request('/api/files')).body.data, []);
  assert.equal((await request('/api/machines', DEMO_PROFILE, 'POST', { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  const allowed = await request('/api/examples', undefined, 'GET', { Origin: 'http://localhost:5175' });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5175');
});

test('AI requires explicit opt-in, while an injected test provider is never a live call', async t => {
  let calls = 0;
  const disabled = await fixture(t, { aiProvider: async () => { calls++; return { text: 'mock' }; } });
  assert.equal((await disabled.request('/api/vision/chat', { messages: [{ role: 'user', content: 'Explain this draft' }] })).body.error.code, 'AI_DISABLED');
  assert.equal(calls, 0);
  const enabled = await fixture(t, { aiEnabled: true, aiProvider: async input => { calls++; return { text: `mock:${input.messages[0].content}` }; } });
  assert.equal((await enabled.request('/api/vision/chat', { messages: [{ role: 'user', content: 'draft' }] })).body.data.text, 'mock:draft');
  assert.equal(calls, 1);
  assert.equal((await enabled.request('/api/vision/chat', { messages: [{ role: 'system', content: 'not allowed' }] })).status, 400);
  assert.equal(calls, 1);
});

test('file quota, request rate, malformed JSON and internal errors stay bounded', async t => {
  const { app, request, url } = await fixture(t);
  for (let i = 0; i < LIMITS.files; i++) app.locals.store.addFile(`fixture-${i}.nc`, 'G1 X1');
  assert.equal((await request('/api/files', { name: 'over-quota.nc', content: 'G1 X1' })).status, 413);
  const malformed = await fetch(url + '/api/gcode/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'INVALID_JSON');
  assert.equal((await request('/api/not-a-route')).status, 404);
  const limited = await fixture(t, { rateLimit: 1 });
  assert.equal((await limited.request('/api/health')).status, 200);
  assert.equal((await limited.request('/api/health')).status, 429);
});

test('new SQLite state survives restart without original deployment data', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cgcg-public-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, 'new.sqlite');
  let store = createStore({ filename });
  const file = store.addFile('persistent.nc', 'G90\nM30');
  store.close();
  store = createStore({ filename });
  assert.equal(store.getFile(file.id).content, 'G90\nM30');
  assert.deepEqual(store.list('machines'), []);
  store.close();
});
