// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/generator/patterns/LinearPath.ts
 * Linear path pattern — single straight line pour.
 */
import { antiDripTransit } from '../routines/AntiDripRoutine.js';
import { dwellMs } from '../routines/DwellRoutine.js';
/**
 * Generate G-Code lines for a linear path pattern in a grid.
 * Simple straight line from cell start to cell end point.
 */
export function generateLinearPath(config, adapter) {
    const geometry = config.geometry;
    const process = config.process;
    const machineProfile = config.machineProfile;
    const safeZ = machineProfile.safeHeight;
    const workZ = 0;
    const gridRows = geometry.gridRows || 1;
    const gridCols = geometry.gridCols || 1;
    const feedRate = process.feedRate;
    const fParam = ` ${adapter.formatCoord('F', feedRate)}`;
    const offsetX = geometry.startX;
    const offsetY = geometry.startY;
    const lines = [];
    lines.push(`; --- DOĞRUSAL YOL (Linear Path) Izgara ${gridRows}x${gridCols} ---`);
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const fromX = offsetX + row * (geometry.width + geometry.gapX);
            const fromY = offsetY + col * (geometry.height + geometry.gapY);
            const toX = fromX + geometry.width;
            const toY = fromY + geometry.height;
            lines.push(`; --- Kapak [${row + 1},${col + 1}] ---`);
            // Transit to start
            lines.push(...antiDripTransit(fromX, fromY, safeZ, workZ, adapter, process.use2AxisOnly));
            // 2) Motion Pre-Delay (Hareket Öncesi Bekleme) - YENİ (E2)
            if (process.motionPreDelay && process.motionPreDelay > 0) {
                lines.push(`${adapter.dwell(process.motionPreDelay)} ; Malı dökmeyi bekleme süresi`);
            }
            // Pre-dwell
            const preDwellLine = dwellMs(process.preDwell, adapter);
            if (preDwellLine)
                lines.push(preDwellLine);
            // Pour on
            if (!process.dryRun) {
                lines.push(`${adapter.pourOn()} ; Döküm AÇ`);
            }
            // Early Close Calculation
            const totalLen = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
            const moveCmd = process.dryRun ? adapter.rapid() : adapter.linear();
            const fParamStr = process.dryRun ? '' : fParam;
            if (process.earlyCloseEnabled && process.earlyCloseDistance && process.earlyCloseDistance > 0 && process.earlyCloseDistance < totalLen) {
                const remainingLen = totalLen - process.earlyCloseDistance;
                const ratio = remainingLen / totalLen;
                const stopX = fromX + ratio * (toX - fromX);
                const stopY = fromY + ratio * (toY - fromY);
                lines.push(`${moveCmd} ${adapter.formatCoord('X', stopX)} ${adapter.formatCoord('Y', stopY)}${fParamStr} ; Erken kapama noktasına ilerle`);
                if (!process.dryRun) {
                    lines.push(`${adapter.pourOff()} ; Şekil erken kapama yapıldı (Malzeme birikmesini önler)`);
                }
                lines.push(`${moveCmd} ${adapter.formatCoord('X', toX)} ${adapter.formatCoord('Y', toY)}${process.forceExplicitF && !process.dryRun ? fParamStr : ''} ; Kalan yolu dökümsüz tamamla`);
            }
            else {
                // Linear move to end point
                lines.push(`${moveCmd} ${adapter.formatCoord('X', toX)} ${adapter.formatCoord('Y', toY)}${fParamStr} ; Doğrusal döküm çizgisi`);
                // Pour off
                if (!process.dryRun) {
                    lines.push(`${adapter.pourOff()} ; Döküm KAPAT`);
                }
            }
            // Post-dwell
            const postDwellLine = dwellMs(process.postDwell, adapter);
            if (postDwellLine)
                lines.push(postDwellLine);
            lines.push('');
        }
    }
    return lines;
}
