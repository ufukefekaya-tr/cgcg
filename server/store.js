// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ApiError } from './validation.js';
import { LIMITS } from './config.js';

const COLLECTIONS = new Set(['machines', 'presets']);

/** New schema only. Original deployment databases are never opened or migrated. */
export function createStore({ filename = ':memory:', seedProfile } = {}) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, name TEXT NOT NULL,
      value TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY(collection,id), UNIQUE(collection,name));
    CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, filename TEXT NOT NULL, content TEXT NOT NULL,
      size_bytes INTEGER NOT NULL, created_at TEXT NOT NULL);`);
  function collection(value) { if (!COLLECTIONS.has(value)) throw new Error('Unknown collection'); return value; }
  function decode(row) { return row ? { ...JSON.parse(row.value), id: row.id, created_at: row.created_at, updated_at: row.updated_at } : null; }
  function list(kind) { return db.prepare('SELECT * FROM records WHERE collection=? ORDER BY created_at,id').all(collection(kind)).map(decode); }
  function get(kind, id) { return decode(db.prepare('SELECT * FROM records WHERE collection=? AND id=?').get(collection(kind), id)); }
  function save(kind, data, id = randomUUID(), update = false) {
    collection(kind);
    const previous = get(kind, id);
    if (update && !previous) throw new ApiError(404, 'NOT_FOUND', 'Record not found');
    if (!previous && list(kind).length >= LIMITS.records) throw new ApiError(413, 'LIMIT_EXCEEDED', 'Collection record limit reached');
    const value = { ...data }; delete value.id; delete value.created_at; delete value.updated_at;
    const now = new Date().toISOString();
    try {
      if (update) db.prepare('UPDATE records SET name=?,value=?,updated_at=? WHERE collection=? AND id=?').run(value.name, JSON.stringify(value), now, kind, id);
      else db.prepare('INSERT INTO records(collection,id,name,value,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(kind, id, value.name, JSON.stringify(value), now, now);
    } catch (error) {
      if (error.message?.includes('UNIQUE constraint')) throw new ApiError(409, 'DUPLICATE', 'A record with this name or ID already exists');
      throw error;
    }
    return get(kind, id);
  }
  if (seedProfile && !db.prepare('SELECT 1 FROM records WHERE collection=? LIMIT 1').get('machines')) save('machines', seedProfile, seedProfile.id || 'demo-millimetre');
  function listFiles() { return db.prepare('SELECT id,filename,size_bytes,created_at FROM files ORDER BY created_at,id').all().map(row => ({ ...row, name: row.filename, size: row.size_bytes })); }
  function getFile(id) {
    const row = db.prepare('SELECT * FROM files WHERE id=?').get(id);
    return row ? { ...row, name: row.filename, size: row.size_bytes, gcode: row.content } : null;
  }
  function addFile(name, content) {
    const count = db.prepare('SELECT count(*) AS count,coalesce(sum(size_bytes),0) AS bytes FROM files').get();
    const size = Buffer.byteLength(content);
    if (count.count >= LIMITS.files || count.bytes + size > LIMITS.totalFileBytes) throw new ApiError(413, 'LIMIT_EXCEEDED', 'Stored file quota reached');
    const id = randomUUID();
    db.prepare('INSERT INTO files(id,filename,content,size_bytes,created_at) VALUES(?,?,?,?,?)').run(id, name, content, size, new Date().toISOString());
    return getFile(id);
  }
  return {
    list, get, save,
    delete(kind, id) { return db.prepare('DELETE FROM records WHERE collection=? AND id=?').run(collection(kind), id).changes > 0; },
    listFiles, getFile, addFile,
    deleteFile(id) { return db.prepare('DELETE FROM files WHERE id=?').run(id).changes > 0; },
    close() { db.close(); },
  };
}
