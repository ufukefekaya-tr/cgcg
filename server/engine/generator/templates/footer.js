// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/generator/templates/footer.ts
 * Program footer template.
 * Program end and termination character.
 */
/**
 * Generate program footer lines.
 */
export function generateFooter(profile, adapter) {
    const lines = [];
    lines.push('');
    lines.push(`; --- PROGRAM SONLANDIRMA ---`);
    // Emit configured termination code; do not infer process I/O shutdown.
    lines.push(`${adapter.programEnd()} ; Configured program end; controller behavior requires verification`);
    lines.push(`% ; Program sonu`);
    return lines;
}
