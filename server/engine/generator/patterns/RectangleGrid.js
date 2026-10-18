// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/generator/patterns/RectangleGrid.ts
 * RectangleGrid pattern — conta dökme grid üretimi.
 * R6: Nested Geometry (İç İçe Döküm) desteği eklendi.
 */
import { antiDripTransit } from '../routines/AntiDripRoutine.js';
import { dwellMs } from '../routines/DwellRoutine.js';
/**
 * Dikdörtgen çizim komutlarını üretir.
 * Pour ON/OFF bu fonksiyonun DIŞINDA kontrol edilir.
 * Bu fonksiyon SADECE geometri hareketlerini üretir.
 */
function drawRectangleShape(p) {
    const { cellX, cellY, cellWidth, cellHeight, cornerR, moveCmd, fParam, fExtra, dryRun, earlyCloseEnabled, earlyCloseDistance, adapter, } = p;
    const lines = [];
    const x2 = cellX + cellWidth;
    const y2 = cellY + cellHeight;
    if (cornerR > 0 && cornerR < Math.min(cellWidth / 2, cellHeight / 2)) {
        // ── Yuvarlatılmış köşe dikdörtgeni ──
        // Alt kenar (sol → sağ, radyüssüz alan)
        lines.push(`${moveCmd} ${adapter.formatCoord('X', x2 - cornerR)}${fParam} ; Alt kenar çizimi`);
        // Sağ alt köşe arkı (CW 90°)
        lines.push(`${adapter.arcCCW()} ${adapter.formatCoord('X', x2)} ${adapter.formatCoord('Y', cellY + cornerR)} ${adapter.formatCoord('I', 0)} ${adapter.formatCoord('J', cornerR)}${fExtra} ; Sağ alt köşe arkı R${cornerR}`);
        // Sağ kenar (aşağı → yukarı)
        lines.push(`${moveCmd} ${adapter.formatCoord('Y', y2 - cornerR)}${fExtra} ; Sağ kenar çizimi`);
        // Sağ üst köşe arkı
        lines.push(`${adapter.arcCCW()} ${adapter.formatCoord('X', x2 - cornerR)} ${adapter.formatCoord('Y', y2)} ${adapter.formatCoord('I', -cornerR)} ${adapter.formatCoord('J', 0)}${fExtra} ; Sağ üst köşe arkı R${cornerR}`);
        // Üst kenar (sağ → sol)
        lines.push(`${moveCmd} ${adapter.formatCoord('X', cellX + cornerR)}${fExtra} ; Üst kenar çizimi`);
        // Sol üst köşe arkı
        lines.push(`${adapter.arcCCW()} ${adapter.formatCoord('X', cellX)} ${adapter.formatCoord('Y', y2 - cornerR)} ${adapter.formatCoord('I', 0)} ${adapter.formatCoord('J', -cornerR)}${fExtra} ; Sol üst köşe arkı R${cornerR}`);
        // Sol kenar (yukarı → aşağı) — Early Close kontrolü
        if (earlyCloseEnabled && earlyCloseDistance && earlyCloseDistance > 0 && earlyCloseDistance < (cellHeight - 2 * cornerR)) {
            const stopY = cellY + cornerR + earlyCloseDistance;
            lines.push(`${moveCmd} ${adapter.formatCoord('Y', stopY)}${fExtra} ; Erken kapama noktasına ilerle`);
            if (!dryRun) {
                lines.push(`${adapter.pourOff()} ; Şekil erken kapama yapıldı`);
            }
            lines.push(`${moveCmd} ${adapter.formatCoord('Y', cellY + cornerR)}${fExtra} ; Kalan yolu dökümsüz tamamla`);
            lines.push(`${adapter.arcCCW()} ${adapter.formatCoord('X', cellX + cornerR)} ${adapter.formatCoord('Y', cellY)} ${adapter.formatCoord('I', cornerR)} ${adapter.formatCoord('J', 0)}${fExtra} ; Sol alt köşe arkı R${cornerR} (başlangıca dön)`);
        }
        else {
            lines.push(`${moveCmd} ${adapter.formatCoord('Y', cellY + cornerR)}${fExtra} ; Sol kenar çizimi`);
            lines.push(`${adapter.arcCCW()} ${adapter.formatCoord('X', cellX + cornerR)} ${adapter.formatCoord('Y', cellY)} ${adapter.formatCoord('I', cornerR)} ${adapter.formatCoord('J', 0)}${fExtra} ; Sol alt köşe arkı R${cornerR} (başlangıca dön)`);
        }
    }
    else {
        // ── Standart keskin köşeli dikdörtgen ──
        lines.push(`${moveCmd} ${adapter.formatCoord('X', x2)}${fParam} ; Alt kenar çizimi`);
        lines.push(`${moveCmd} ${adapter.formatCoord('Y', y2)}${fExtra} ; Sağ kenar çizimi`);
        lines.push(`${moveCmd} ${adapter.formatCoord('X', cellX)}${fExtra} ; Üst kenar çizimi`);
        // Erken Kapama (Early Close)
        if (earlyCloseEnabled && earlyCloseDistance && earlyCloseDistance > 0 && earlyCloseDistance < cellHeight) {
            const stopY = cellY + earlyCloseDistance;
            lines.push(`${moveCmd} ${adapter.formatCoord('Y', stopY)}${fExtra} ; Erken kapama noktasına ilerle`);
            if (!dryRun) {
                lines.push(`${adapter.pourOff()} ; Şekil erken kapama yapıldı`);
            }
            lines.push(`${moveCmd} ${adapter.formatCoord('Y', cellY)}${fExtra} ; Kalan yolu dökümsüz tamamla`);
        }
        else {
            lines.push(`${moveCmd} ${adapter.formatCoord('Y', cellY)}${fExtra} ; Sol kenar çizimi`);
        }
    }
    return lines;
}
// ─────────────────────────────────────────────────────────────
// Ana grid üretici
// ─────────────────────────────────────────────────────────────
/**
 * Generate G-Code lines for a rectangular grid pattern.
 * R6: innerGeometry aktifse her hücrede "Dış Kutu → Kapat → İç Kutu → Kapat"
 *     sırasıyla en kısa yolu (shortest path) izler.
 */
export function generateRectangleGrid(config, adapter) {
    const geometry = config.geometry;
    const process = config.process;
    const machineProfile = config.machineProfile;
    const { width: cellWidth, height: cellHeight, gridRows, gridCols, gapX, gapY, startX, startY, } = geometry;
    const cornerR = geometry.cornerRadius || 0;
    const safeZ = machineProfile.safeHeight;
    const workZ = 0;
    const feedRate = process.feedRate;
    // G-Code work koordinatlarında (G54) üretilir — workOffset EKLENMEZ
    const offsetX = startX;
    const offsetY = startY;
    const moveCmd = process.dryRun ? adapter.rapid() : adapter.linear();
    const fParam = process.dryRun ? '' : ` ${adapter.formatCoord('F', feedRate)}`;
    const fExtra = process.forceExplicitF && !process.dryRun ? fParam : '';
    const lines = [];
    lines.push(`; --- RECTANGLE GRID (RectangleGrid) ${gridRows}x${gridCols} ---`);
    lines.push(`; Eksen: X=YATAY(${machineProfile.table.width}mm), Y=DİKEY(${machineProfile.table.height}mm)`);
    if (cornerR > 0) {
        lines.push(`; Köşe Radyüsü: R${cornerR}mm`);
    }
    if (geometry.innerGeometry?.enabled) {
        lines.push(`; İç İçe Döküm (Nested Geometry) AKTİF — ${geometry.innerGeometry.width}x${geometry.innerGeometry.height}mm`);
    }
    // Grid axis mapping:
    // gridRows → X ekseni boyunca (YATAY), width = X boyutu
    // gridCols → Y ekseni boyunca (DİKEY), height = Y boyutu
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            // row → X ekseni (YATAY), col → Y ekseni (DİKEY)
            const cellX = offsetX + row * (cellWidth + gapX);
            const cellY = offsetY + col * (cellHeight + gapY);
            lines.push(`; --- Kapak [${row + 1},${col + 1}] ---`);
            // ════════════════════════════════════════════════════
            // ADIM 1: DIŞ KUTU ÇİZİMİ
            // ════════════════════════════════════════════════════
            // 1a) Anti-drip transit — hücre başlangıcına git
            const startPosX = cornerR > 0 ? cellX + cornerR : cellX;
            const startPosY = cellY;
            lines.push(...antiDripTransit(startPosX, startPosY, safeZ, workZ, adapter, process.use2AxisOnly));
            // 1b) Pour ON
            if (!process.dryRun) {
                lines.push(`${adapter.pourOn()} ; Döküm AÇ`);
            }
            // 1c) Motion Pre-Delay (Malı dökmeyi bekleme süresi)
            if (process.motionPreDelay && process.motionPreDelay > 0) {
                lines.push(`${adapter.dwell(process.motionPreDelay)} ; Malı dökmeyi bekleme süresi`);
            }
            // 1d) Pre-Dwell (basınç dengeleme)
            const preDwellLine = dwellMs(process.preDwell, adapter);
            if (preDwellLine)
                lines.push(preDwellLine);
            // 1e) Dış dikdörtgen çizimi
            const outerDrawLines = drawRectangleShape({
                cellX, cellY, cellWidth, cellHeight, cornerR,
                moveCmd, fParam, fExtra,
                dryRun: process.dryRun,
                // Nested geometry yoksa early close dışta yapılır
                earlyCloseEnabled: !geometry.innerGeometry?.enabled && process.earlyCloseEnabled,
                earlyCloseDistance: process.earlyCloseDistance,
                adapter,
            });
            lines.push(...outerDrawLines);
            // 1f) Dış kutunun dökümünü kapat (early close halinde zaten kapalı)
            const outerHadEarlyClose = !geometry.innerGeometry?.enabled
                && process.earlyCloseEnabled
                && process.earlyCloseDistance
                && process.earlyCloseDistance > 0;
            if (!outerHadEarlyClose && !process.dryRun) {
                lines.push(`${adapter.pourOff()} ; Dış kutu döküm KAPAT`);
            }
            // ════════════════════════════════════════════════════
            // ADIM 2: İÇ KUTU ÇİZİMİ (NESTED GEOMETRY)
            // ════════════════════════════════════════════════════
            if (geometry.innerGeometry?.enabled) {
                const inner = geometry.innerGeometry;
                if (inner.width == null || inner.height == null) {
                    throw new Error('GÜVENLİK HATASI: İç geometri aktif ama width/height belirtilmemiş.');
                }
                const innerWidth = inner.width;
                const innerHeight = inner.height;
                const innerCornerR = inner.cornerRadius ?? 0;
                // İç kutunun merkezi = dış kutunun merkezine oturtulur
                const innerX = cellX + (cellWidth - innerWidth) / 2;
                const innerY = cellY + (cellHeight - innerHeight) / 2;
                lines.push(`; --- İç Döküm [${row + 1},${col + 1}] (${innerWidth}x${innerHeight}mm) ---`);
                // 2a) Kafa zaten iş yüzeyinde. Kısa mesafe olduğu için
                //     Anti-drip transit KULLANMIYORUZ — shortest path.
                //     Sadece rapid ile iç kutunun başlangıcına git.
                const innerStartX = innerCornerR > 0 ? innerX + innerCornerR : innerX;
                const innerStartY = innerY;
                lines.push(`${adapter.rapid()} ${adapter.formatCoord('X', innerStartX)} ; İç kutuya kısa transit (X)`);
                lines.push(`${adapter.rapid()} ${adapter.formatCoord('Y', innerStartY)} ; İç kutuya kısa transit (Y)`);
                // 2b) Pour ON (iç döküm)
                if (!process.dryRun) {
                    lines.push(`${adapter.pourOn()} ; İç Döküm AÇ`);
                }
                // 2c) İç döküm için kısa bekleme (motionPreDelay'in yarısı)
                if (process.motionPreDelay && process.motionPreDelay > 0) {
                    const innerDelay = Math.round(process.motionPreDelay / 2);
                    lines.push(`${adapter.dwell(innerDelay)} ; İç döküm bekleme süresi`);
                }
                // 2d) İç dikdörtgen çizimi
                const innerDrawLines = drawRectangleShape({
                    cellX: innerX,
                    cellY: innerY,
                    cellWidth: innerWidth,
                    cellHeight: innerHeight,
                    cornerR: innerCornerR,
                    moveCmd, fParam, fExtra,
                    dryRun: process.dryRun,
                    earlyCloseEnabled: process.earlyCloseEnabled,
                    earlyCloseDistance: process.earlyCloseDistance,
                    adapter,
                });
                lines.push(...innerDrawLines);
                // 2e) İç kutunun dökümünü kapat
                const innerHadEarlyClose = process.earlyCloseEnabled
                    && process.earlyCloseDistance
                    && process.earlyCloseDistance > 0;
                if (!innerHadEarlyClose && !process.dryRun) {
                    lines.push(`${adapter.pourOff()} ; İç kutu döküm KAPAT`);
                }
            }
            // ════════════════════════════════════════════════════
            // ADIM 3: POST-DWELL (her iki döküm bittikten sonra)
            // ════════════════════════════════════════════════════
            const postDwellLine = dwellMs(process.postDwell, adapter);
            if (postDwellLine)
                lines.push(postDwellLine);
            lines.push('');
        }
    }
    return lines;
}
// ─────────────────────────────────────────────────────────────
// Grid mesafe hesaplayıcı (Telemetri)
// ─────────────────────────────────────────────────────────────
export function calculateGridDistance(config) {
    const geometry = config.geometry;
    const outerPerimeter = 2 * (geometry.width + geometry.height) - (8 - 2 * Math.PI) * (geometry.cornerRadius || 0);
    const cellCount = (geometry.gridRows || 1) * (geometry.gridCols || 1);
    let totalCuttingDistance = outerPerimeter * cellCount;
    // İç geometri varsa onu da ekle
    if (geometry.innerGeometry?.enabled && geometry.innerGeometry.width != null && geometry.innerGeometry.height != null) {
        const innerW = geometry.innerGeometry.width;
        const innerH = geometry.innerGeometry.height;
        const innerPerimeter = 2 * (innerW + innerH) - (8 - 2 * Math.PI) * (geometry.innerGeometry.cornerRadius || 0);
        totalCuttingDistance += innerPerimeter * cellCount;
    }
    return {
        totalDistance: totalCuttingDistance,
        cellCount,
    };
}
