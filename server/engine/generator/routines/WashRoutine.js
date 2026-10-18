// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/generator/routines/WashRoutine.ts
 * Wash cycle block generation.
 * REF: M32 (Lubrication On) / M33 (Lubrication Off) — PLC relay M51→Y08
 */
/**
 * Generate a wash cycle block: wash on → dwell → wash off
 */
export function generateWashBlock(washDurationMs, adapter) {
    const lines = [];
    lines.push(adapter.washOn());
    lines.push(adapter.dwell(washDurationMs));
    lines.push(adapter.washOff());
    return lines;
}
/**
 * Generate a blow/air cycle block: blow on → dwell → blow off
 */
export function generateBlowBlock(blowDurationMs, adapter) {
    const lines = [];
    lines.push(adapter.blowOn());
    lines.push(adapter.dwell(blowDurationMs));
    lines.push(adapter.blowOff());
    return lines;
}
