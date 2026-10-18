// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import { LIMITS } from './config.js';

export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

export function object(value, label = 'Request body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'INVALID_INPUT', `${label} must be an object`);
  return value;
}

export function text(value, label, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/u.test(value)) {
    throw new ApiError(400, 'INVALID_INPUT', `${label} must be nonempty text of at most ${max} characters`);
  }
  return value.trim();
}

export function gcodeText(value) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) throw new ApiError(400, 'INVALID_INPUT', 'G-code must be nonempty text without NUL bytes');
  if (Buffer.byteLength(value) > LIMITS.gcodeBytes || value.split('\n').length > LIMITS.gcodeLines) {
    throw new ApiError(413, 'LIMIT_EXCEEDED', 'G-code exceeds the supported byte or line limit');
  }
  return value;
}

export function filename(value) {
  const name = text(value, 'Filename');
  if (/[\\/]/u.test(name) || !/^[\p{L}\p{N}][\p{L}\p{N} ._()-]*\.(?:nc|cnc|tap|gcode|txt)$/iu.test(name)) {
    throw new ApiError(400, 'INVALID_FILENAME', 'Use a plain .nc, .cnc, .tap, .gcode or .txt filename');
  }
  return name;
}

export function identifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/u.test(value)) throw new ApiError(400, 'INVALID_ID', 'Invalid record identifier');
  return value;
}

export function exactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new ApiError(400, 'INVALID_INPUT', `Unexpected ${label} field: ${key}`);
}
