// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/** Generate an editable draft in millimetres and the selected work coordinate. */
import { createAdapter } from '../adapters/ControllerAdapter.js';
import { normalizeGenerationRequest } from '../validateInput.js';
import { generateHeader } from './templates/header.js';
import { generateFooter } from './templates/footer.js';
import { generateRectangleGrid, calculateGridDistance } from './patterns/RectangleGrid.js';
import { generateCirclePattern } from './patterns/CirclePattern.js';
import { generateLinearPath } from './patterns/LinearPath.js';
import { generateWashBlock, generateBlowBlock } from './routines/WashRoutine.js';
import { parse } from '../parser/GCodeParser.js';

export function generate(raw) {
    const config = normalizeGenerationRequest(raw);
    const adapter = createAdapter(config.machineProfile);
    const entries = config.geometries;
    const metrics = calculateMetrics(config);
    const lines = generateHeader(config.machineProfile, adapter, {
        patternType: entries.length > 1 ? 'multi' : entries[0].geometry.patternType,
        totalCells: metrics.totalCells, estimatedTime: metrics.estimatedTime,
        feedRate: entries[0].process.feedRate, use2AxisOnly: config.use2AxisOnly,
    });
    entries.forEach((entry, index) => {
        const { process } = entry;
        lines.push(`; --- GEOMETRY ${entry.sequence} ---`);
        if (index > 0 && process.interGeometryDelay > 0) lines.push(adapter.dwell(process.interGeometryDelay));
        if (process.prePourPrimingEnabled) {
            // Validation requires explicit operator-approved positioning for priming.
            lines.push('; Priming at the operator-verified machine position');
            lines.push(adapter.machineZero());
            lines.push(adapter.pourOn(), adapter.dwell(process.prePourPrimingDuration), adapter.pourOff());
            lines.push(adapter.workCoord());
        }
        const subConfig = { geometry: entry.geometry, process, machineProfile: config.machineProfile };
        switch (entry.geometry.patternType) {
            case 'rectangleGrid': lines.push(...generateRectangleGrid(subConfig, adapter)); break;
            case 'circle': lines.push(...generateCirclePattern(subConfig, adapter)); break;
            case 'linearPath': lines.push(...generateLinearPath(subConfig, adapter)); break;
            default: throw new TypeError('Unsupported pattern type');
        }
    });
    const finalProcess = entries.at(-1).process;
    lines.push('; --- PROGRAM FINISH ---', adapter.pourOff());
    if (!config.use2AxisOnly) lines.push(`${adapter.rapid()} ${adapter.formatCoord('Z', config.machineProfile.safeHeight)} ; Configured vertical clearance`);
    const machineZero = adapter.machineZero();
    if (machineZero) lines.push(`${machineZero} ; Explicit operator-verified machine-coordinate command`);
    if (finalProcess.washEnabled) lines.push('; Wash I/O at the resulting position; operator must verify', ...generateWashBlock(finalProcess.washDuration, adapter));
    if (finalProcess.blowEnabled) lines.push('; Air I/O at the resulting position; operator must verify', ...generateBlowBlock(finalProcess.blowDuration, adapter));
    lines.push(...generateFooter(config.machineProfile, adapter));
    const gcode = lines.join('\n');
    return {
        gcode, ast: parse(gcode),
        metadata: { totalLines: lines.length, ...metrics, patternType: entries.length > 1 ? 'multi' : entries[0].geometry.patternType, use2AxisOnly: config.use2AxisOnly, requiresOperatorReview: true },
    };
}
function calculateMetrics(config) {
    let totalDistance = 0, estimatedTime = 0, totalCells = 0;
    for (const [index, { geometry, process }] of config.geometries.entries()) {
        const count = geometry.gridRows * geometry.gridCols;
        let distance;
        if (geometry.patternType === 'rectangleGrid') distance = calculateGridDistance({ geometry }).totalDistance;
        else if (geometry.patternType === 'circle') distance = 2 * Math.PI * geometry.radius * count;
        else distance = Math.hypot(geometry.width, geometry.height) * count;
        totalCells += count;
        totalDistance += distance;
        estimatedTime += distance / process.feedRate * 60;
        estimatedTime += (process.preDwell + process.postDwell + process.motionPreDelay) / 1000 * count;
        if (process.prePourPrimingEnabled) estimatedTime += process.prePourPrimingDuration / 1000;
        if (index > 0) estimatedTime += process.interGeometryDelay / 1000;
    }
    const finalProcess = config.geometries.at(-1).process;
    if (finalProcess.washEnabled) estimatedTime += finalProcess.washDuration / 1000;
    if (finalProcess.blowEnabled) estimatedTime += finalProcess.blowDuration / 1000;
    // Estimate excludes rapid positioning, acceleration, machine I/O latency and controller overhead.
    return { totalDistance, estimatedTime, totalCells };
}
