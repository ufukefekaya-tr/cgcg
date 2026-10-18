// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/generator/routines/SafetyRoutines.ts
 * Axis-separated transits with optional configured vertical clearance.
 * Path clearance and machine behavior require operator verification.
 */
/**
 * Generate orthogonal transit lines from current position to target.
 * Moves one axis at a time; this does not establish path clearance.
 * Sequence: Z up → X move → Y move → Z down
 */
export function orthogonalTransit(toX, toY, safeZ, adapter, use2AxisOnly = true) {
    const lines = [];
    // 1) Rise to safe height
    if (!use2AxisOnly) lines.push(`${adapter.rapid()} ${adapter.formatCoord('Z', safeZ)}`);
    // 2) Move X axis first
    lines.push(`${adapter.rapid()} ${adapter.formatCoord('X', toX)}`);
    // 3) Move Y axis second
    lines.push(`${adapter.rapid()} ${adapter.formatCoord('Y', toY)}`);
    return lines;
}
/**
 * Safe height rise only.
 */
export function safeHeightUp(safeZ, adapter, use2AxisOnly = true) {
    if (use2AxisOnly) return null;
    return `${adapter.rapid()} ${adapter.formatCoord('Z', safeZ)}`;
}
/**
 * Descend from safe height to work surface.
 */
export function safeHeightDown(workZ, adapter, use2AxisOnly = true) {
    if (use2AxisOnly) return null;
    return `${adapter.rapid()} ${adapter.formatCoord('Z', workZ)}`;
}
