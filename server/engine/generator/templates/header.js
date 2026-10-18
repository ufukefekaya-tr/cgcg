// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/generator/templates/header.ts
 * Program header template.
 * Emits requested setup and configured process-off commands for operator review.
 */
/**
 * Generate program header lines.
 */
export function generateHeader(profile, adapter, metadata) {
    const lines = [];
    const now = new Date().toISOString().split('T')[0];
    const programNo = metadata?.programNumber || '1001';
    // Draft program header
    lines.push(`%`);
    lines.push(`O${programNo}`);
    // Comment block
    lines.push(`; =========================================`);
    lines.push(`; CONTA G-CODE GENERATOR (CGCG) ÇIKTISI`);
    lines.push(`; EDITABLE DRAFT: verify controller, I/O, coordinates, and toolpath before use`);
    lines.push(`; Tarih         : ${now}`);
    lines.push(`; Kontrolcü     : ${profile.name}`);
    if (metadata) {
        if (metadata.patternType) {
            lines.push(`; Desen Tipi    : ${metadata.patternType}${metadata.gridInfo ? ' ' + metadata.gridInfo : ''}`);
        }
        if (metadata.totalCells !== undefined) {
            lines.push(`; Toplam Kapak  : ${metadata.totalCells} adet`);
        }
        if (metadata.estimatedTime !== undefined) {
            const mins = Math.floor(metadata.estimatedTime / 60);
            const secs = Math.round(metadata.estimatedTime % 60);
            lines.push(`; Tahmini Süre  : ~${mins} dk ${secs} sn`);
        }
    }
    lines.push(`; =========================================`);
    lines.push('');
    lines.push(`; --- PROGRAM SETUP: OPERATOR REVIEW REQUIRED ---`);
    // Requested controller setup
    lines.push(`G17 G21 G40 ; XY Düzlemi, Metrik, Telafi İptal`);
    lines.push(`${adapter.absoluteMode()} ; Mutlak Programlama Modu`);
    lines.push(`${profile.workCoordinate} ; İş parçası sıfır noktası seçimi`);
    if (metadata?.feedRate) {
        lines.push(`F${metadata.feedRate} ; Tüm çalışma hızları varsayılan`);
    }

    if (!metadata?.use2AxisOnly) {
        lines.push(`${adapter.rapid()} ${adapter.formatCoord('Z', profile.safeHeight)} ; Configured vertical clearance; verify before operation`);
    }
    lines.push(`${adapter.pourOff()} ; Configured process output off`);
    lines.push(`${adapter.coolantOff()} ; Configured coolant off`);
    lines.push('');
    return lines;
}
