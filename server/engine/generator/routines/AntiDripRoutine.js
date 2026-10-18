// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/generator/routines/AntiDripRoutine.ts
 * Anti-drip transit protection.
 * When pour head (M04) is active, it MUST be closed (M05) before any rapid transit.
 */
import { orthogonalTransit } from './SafetyRoutines.js';
/**
 * Generate anti-drip transit sequence.
 * Closes pour head → rises to safe height → orthogonal move → descends.
 * Does NOT re-open pour head — caller decides when to M04 again.
 */
export function antiDripTransit(toX, toY, safeZ, workZ, adapter, use2AxisOnly = true) {
    const lines = [];
    // 1) Close pour head before transit
    lines.push(adapter.pourOff());
    // 2) Orthogonal transit (includes Z rise)
    lines.push(...orthogonalTransit(toX, toY, safeZ, adapter, use2AxisOnly));
    // 3) Descend to work surface
    if (!use2AxisOnly) lines.push(`${adapter.rapid()} ${adapter.formatCoord('Z', workZ)}`);
    return lines;
}
