// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/generator/patterns/CirclePattern.ts
 * Circle pattern generation (for future FAZ V1 extension).
 * Uses G02/G03 arc interpolation.
 */
import { antiDripTransit } from '../routines/AntiDripRoutine.js';
import { dwellMs } from '../routines/DwellRoutine.js';
/**
 * Generate G-Code lines for a circular pattern in a grid.
 * Full circle using G02 (CW) with I,J center offset.
 */
export function generateCirclePattern(config, adapter) {
    const geometry = config.geometry;
    const process = config.process;
    const machineProfile = config.machineProfile;
    const radius = geometry.radius ?? geometry.width / 2;
    const gridRows = geometry.gridRows || 1;
    const gridCols = geometry.gridCols || 1;
    const safeZ = machineProfile.safeHeight;
    const workZ = 0;
    const feedRate = process.feedRate;
    const fParam = ` ${adapter.formatCoord('F', feedRate)}`;
    const offsetX = geometry.startX;
    const offsetY = geometry.startY;
    const lines = [];
    lines.push(`; --- DAİRE (Circle) R=${radius} Izgara ${gridRows}x${gridCols} ---`);
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            // Cell top-left origin
            const cellX = offsetX + row * (geometry.width + geometry.gapX);
            const cellY = offsetY + col * (geometry.height + geometry.gapY);
            // Center of the current circle
            const centerX = cellX + radius;
            const centerY = cellY + radius;
            // Start at 3 o'clock position
            const startX = centerX + radius;
            const startY = centerY;
            lines.push(`; --- Kapak [${row + 1},${col + 1}] ---`);
            // 1) Transit to start point
            lines.push(...antiDripTransit(startX, startY, safeZ, workZ, adapter, process.use2AxisOnly));
            // 2) Motion Pre-Delay (Hareket Öncesi Bekleme) - YENİ (E2)
            if (process.motionPreDelay && process.motionPreDelay > 0) {
                lines.push(`${adapter.dwell(process.motionPreDelay)} ; Malı dökmeyi bekleme süresi`);
            }
            // 3) Pre-dwell
            const preDwellLine = dwellMs(process.preDwell, adapter);
            if (preDwellLine)
                lines.push(preDwellLine);
            // 4) Pour on
            if (!process.dryRun) {
                lines.push(`${adapter.pourOn()} ; Döküm AÇ`);
            }
            // 5) Draw Circle
            if (process.earlyCloseEnabled && process.earlyCloseDistance && process.earlyCloseDistance > 0 && process.earlyCloseDistance < (2 * Math.PI * radius)) {
                // Calculate early close angles
                const circumference = 2 * Math.PI * radius;
                const remainingDist = circumference - process.earlyCloseDistance;
                // theta is the angle from 0 (3 o'clock) clockwise. In math, CW is negative angle.
                // We use absolute positive angle for length:
                const theta = (remainingDist / circumference) * 2 * Math.PI;
                // Target coordinates for early close
                // Standard math: x = cx + r*cos(a), y = cy + r*sin(a)
                // Since we go CW, angle decreases from 0 to -theta.
                const stopX = centerX + radius * Math.cos(-theta);
                const stopY = centerY + radius * Math.sin(-theta);
                // Segment 1: from Start (3 o'clock) to Stop
                lines.push(`${adapter.arcCW()} ${adapter.formatCoord('X', stopX)} ${adapter.formatCoord('Y', stopY)} ${adapter.formatCoord('I', -radius)} J0${fParam} ; Erken kapama noktasına kavis`);
                if (!process.dryRun) {
                    lines.push(`${adapter.pourOff()} ; Şekil erken kapama yapıldı (Malzeme birikmesini önler)`);
                }
                // Segment 2: from Stop to Start
                // Relative center from Stop point
                const i2 = centerX - stopX;
                const k2 = centerY - stopY;
                lines.push(`${adapter.arcCW()} ${adapter.formatCoord('X', startX)} ${adapter.formatCoord('Y', startY)} ${adapter.formatCoord('I', i2)} ${adapter.formatCoord('J', k2)}${process.forceExplicitF ? fParam : ''} ; Kalan dairesel yolu dökümsüz tamamla`);
            }
            else {
                // Full circle: G02 with I=-radius, K=0
                lines.push(`${adapter.arcCW()} ${adapter.formatCoord('X', startX)} ${adapter.formatCoord('Y', startY)} ${adapter.formatCoord('I', -radius)} J0${fParam} ; Tam daire çizimi`);
                // Pour off
                if (!process.dryRun) {
                    lines.push(`${adapter.pourOff()} ; Döküm KAPAT`);
                }
            }
            // 6) Post-dwell
            const postDwellLine = dwellMs(process.postDwell, adapter);
            if (postDwellLine)
                lines.push(postDwellLine);
            lines.push('');
        }
    }
    return lines;
}
