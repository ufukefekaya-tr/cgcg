// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/parser/GCodeParser.ts
 * Parses multi-line G-Code string into GCodeAST with modal state tracking.
 */
import { normalizeGcode } from '../validateInput.js';
import { parseLine } from './GCodeLexer.js';
// Modal group 1: motion codes — persist until overridden
const MODAL_GROUP_1 = new Set(['G00', 'G01', 'G02', 'G03']);
/**
 * Parse a multi-line G-Code string into an AST.
 * Tracks modal G codes so lines without G codes inherit the last active motion mode.
 */
export function parse(gcode) {
    gcode = normalizeGcode(gcode);
    const rawLines = gcode.split(/\r?\n/);
    const ast = [];
    let activeModalG = null;
    let activeFeedRate = null;
    for (let i = 0; i < rawLines.length; i++) {
        const line = parseLine(rawLines[i], i + 1);
        // Track modal G code (group 1: motion)
        if (line.gCode !== null && MODAL_GROUP_1.has(line.gCode)) {
            activeModalG = line.gCode;
        }
        // Track modal feedrate
        if (line.params.F !== undefined) {
            activeFeedRate = line.params.F;
        }
        // Attach modal feedrate to line if available
        if (activeFeedRate !== null) {
            line.modalFeedRate = activeFeedRate;
        }
        // If line has coordinate params but no G code, inherit modal G
        if (line.gCode === null &&
            line.type === 'unknown' &&
            hasCoordinateParams(line.params) &&
            activeModalG !== null) {
            line.gCode = activeModalG;
            line.type = 'motion';
        }
        ast.push(line);
    }
    return ast;
}
/**
 * Check if params contain any coordinate axis values.
 */
function hasCoordinateParams(params) {
    const coordKeys = ['X', 'Y', 'Z', 'U', 'V', 'W', 'A', 'B', 'C', 'I', 'K', 'R'];
    return coordKeys.some(key => key in params);
}
