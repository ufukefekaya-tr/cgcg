// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/generator/routines/DwellRoutine.ts
 * G04 dwell injection for pressure stabilization.
 * REF: G04 P(ms) or G04 X(s) — New_KER.md Section 2.4.2 (7)
 */
/**
 * Generate a dwell line (G04) with specified duration in milliseconds.
 * Returns null if duration <= 0.
 */
export function dwellMs(ms, adapter) {
    if (ms <= 0)
        return null;
    return adapter.dwell(ms);
}
/**
 * Generate a dwell line with duration in seconds.
 * Converts to milliseconds; the selected adapter controls the output dialect.
 */
export function dwellSeconds(seconds, adapter) {
    if (seconds <= 0)
        return null;
    return adapter.dwell(Math.round(seconds * 1000));
}
