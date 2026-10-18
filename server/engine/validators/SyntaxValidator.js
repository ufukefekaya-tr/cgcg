// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import { normalizeMachineProfile } from '../validateInput.js';
import { tokenizeLine } from '../parser/GCodeLexer.js';
// This is the subset understood by these static checks, not a controller capability list.
const CHECKED_G_CODES = new Set(['G00','G01','G02','G03','G04','G17','G20','G21','G40','G54','G55','G56','G57','G58','G59','G90','G91','G990','G991']);
const CHECKED_PARAMETERS = new Set(['G','M','N','O','X','Y','Z','I','J','R','F','S','P']);
export function validateSyntax(ast, rawProfile) {
    const profile = rawProfile === undefined ? null : normalizeMachineProfile(rawProfile);
    const configuredM = profile ? new Set(Object.values(profile.mCodes)) : new Set(['M00','M01','M02','M03','M04','M05','M08','M09','M30']);
    const issues = [];
    const add = (line, code, message) => issues.push({ line: line.lineNumber, severity: 'error', code, message });
    for (const line of ast) {
        if (line.type === 'empty' || line.type === 'comment') continue;
        const code = line.raw.replace(/\([^)]*\)/g, '').split(';')[0].trim();
        if (code === '%') continue;
        const remainder = code.replace(/[A-Z][+-]?(?:\d*\.\d+|\d+\.?\d*)/gi, '').trim();
        if (remainder) add(line, 'UNSUPPORTED_EXPRESSION', 'Unsupported expression, macro, delimiter, or unparsed text.');
        const tokens = tokenizeLine(line.raw);
        const seen = new Set();
        for (const token of tokens) {
            if (!CHECKED_PARAMETERS.has(token.type)) add(line, 'UNSUPPORTED_PARAMETER', `Parameter ${token.raw} is outside the checked subset.`);
            if (seen.has(token.type) && !['G','M'].includes(token.type)) add(line, 'DUPLICATE_PARAMETER', `Duplicate ${token.type} word.`);
            seen.add(token.type);
            if (['G','M','N','O'].includes(token.type) && (!Number.isInteger(token.value) || token.value < 0)) add(line, 'UNSUPPORTED_CODE_FORMAT', `Non-integer or negative ${token.type} word.`);
        }
        const gs = line.gCodes?.length ? line.gCodes : (line.gCode ? [line.gCode] : []);
        for (const g of gs) if (!CHECKED_G_CODES.has(g)) add(line, 'UNSUPPORTED_G_CODE', `${g} is outside the static checker's supported subset.`);
        for (const m of line.mCodes ?? []) if (!configuredM.has(m)) add(line, 'UNSUPPORTED_M_CODE', `${m} is not mapped in the supplied profile.`);
        const motion = gs.filter(g => ['G00','G01','G02','G03'].includes(g));
        if (motion.length > 1) add(line, 'CONFLICTING_MOTION_CODES', 'Multiple motion modes in one block.');
        if (gs.includes('G90') && gs.includes('G91') || gs.includes('G20') && gs.includes('G21')) add(line, 'CONFLICTING_MODAL_CODES', 'Conflicting modal settings in one block.');
        if (['G02','G03'].includes(line.gCode)) {
            const center = 'I' in line.params || 'J' in line.params;
            if (!center && !('R' in line.params)) add(line, 'ARC_MISSING_CENTER', 'XY arc requires I/J center offsets or a radius.');
            if (center && 'R' in line.params) add(line, 'AMBIGUOUS_ARC_CENTER', 'Arc cannot specify both center offsets and radius.');
        }
        if ('F' in line.params && line.params.F <= 0) add(line, 'INVALID_FEEDRATE', 'Feed rate must be positive.');
        if ('P' in line.params && line.params.P < 0) add(line, 'INVALID_DWELL', 'Dwell duration cannot be negative.');
    }
    return issues;
}
