// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/parser/GCodeLexer.ts
 * Tokenizes a single G-Code line into structured tokens.
 * Pure function — no side effects, no state.
 */
// Regex: letter followed by optional sign and number (integer or decimal)
// Supports trailing decimals e.g., 10. and leading decimals e.g. .5
const TOKEN_REGEX = /([A-Z])([+-]?(?:\d*\.\d+|\d+\.?\d*))/gi;
const COMMENT_PAREN = /\(([^)]*)\)/;
const COMMENT_SEMI = /;(.*)$/;
// G-codes that indicate motion
const MOTION_CODES = new Set([
    'G00', 'G0', 'G01', 'G1', 'G02', 'G2', 'G03', 'G3',
]);
// G-codes that indicate settings
const SETTING_CODES = new Set([
    'G90', 'G990', 'G91', 'G991',
    'G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59',
    'G21', 'G20', 'G15', 'G16',
    'G40', 'G41', 'G42',
    'G50', 'G52',
    'G96', 'G97', 'G98', 'G99',
]);
// G-codes that indicate cycles
const CYCLE_CODES = new Set([
    'G70', 'G71', 'G72', 'G73', 'G74', 'G75', 'G76',
    'G22', 'G800',
]);
/**
 * Tokenize a single G-Code line string into an array of Tokens.
 */
export function tokenizeLine(line) {
    const tokens = [];
    const cleaned = stripComments(line);
    let match;
    TOKEN_REGEX.lastIndex = 0;
    while ((match = TOKEN_REGEX.exec(cleaned)) !== null) {
        const letter = match[1].toUpperCase();
        const value = parseFloat(match[2]);
        if (!Number.isFinite(value)) throw new TypeError('Non-finite numeric G-code token');
        const tokenType = isValidTokenType(letter) ? letter : 'UNKNOWN';
        tokens.push({
            type: tokenType,
            value,
            raw: match[0],
        });
    }
    return tokens;
}
/**
 * Extract comment from a G-Code line.
 */
export function extractComment(line) {
    // Check parenthesized comment
    const parenMatch = line.match(COMMENT_PAREN);
    if (parenMatch)
        return parenMatch[1].trim();
    // Check semicolon comment
    const semiMatch = line.match(COMMENT_SEMI);
    if (semiMatch)
        return semiMatch[1].trim();
    return null;
}
/**
 * Strip comments from line, returning only the code portion.
 */
function stripComments(line) {
    let result = line;
    // Remove parenthesized comments
    result = result.replace(/\([^)]*\)/g, '');
    // Remove semicolon comments
    const semiIdx = result.indexOf(';');
    if (semiIdx >= 0)
        result = result.substring(0, semiIdx);
    return result.trim();
}
/**
 * Parse a single line into a GCodeLine AST node.
 */
export function parseLine(raw, index) {
    const trimmed = raw.trim();
    // Empty line
    if (trimmed.length === 0) {
        return {
            lineNumber: index,
            type: 'empty',
            gCode: null,
            mCode: null,
            gCodes: [],
            mCodes: [],
            params: {},
            raw,
            comment: null,
        };
    }
    // Full comment line
    if (trimmed.startsWith(';') || (trimmed.startsWith('(') && stripComments(trimmed) === '')) {
        return {
            lineNumber: index,
            type: 'comment',
            gCode: null,
            mCode: null,
            gCodes: [],
            mCodes: [],
            params: {},
            raw,
            comment: trimmed.startsWith(';') ? trimmed.substring(1).trim() : extractComment(trimmed),
        };
    }
    const tokens = tokenizeLine(trimmed);
    const comment = extractComment(trimmed);
    let gCode = null;
    let mCode = null;
    const gCodes = [];
    const mCodes = [];
    let lineNumber = index;
    const params = {};
    for (const token of tokens) {
        switch (token.type) {
            case 'G': {
                const normG = normalizeGCode(token.value);
                if (gCode === null)
                    gCode = normG;
                gCodes.push(normG);
                break;
            }
            case 'M': {
                const normM = normalizeMCode(token.value);
                if (mCode === null)
                    mCode = normM;
                mCodes.push(normM);
                break;
            }
            case 'N':
                lineNumber = token.value;
                break;
            default:
                if (token.type !== 'UNKNOWN') {
                    params[token.type] = token.value;
                }
                break;
        }
    }
    const motion = gCodes.find(code => MOTION_CODES.has(code));
    if (motion) gCode = motion;
    const type = determineLineType(gCode, mCode);
    return {
        lineNumber,
        type,
        gCode,
        mCode,
        gCodes,
        mCodes,
        params,
        raw,
        comment,
    };
}
/**
 * Normalize G code number to standard format: G00, G01, G02, etc.
 */
function normalizeGCode(value) {
    const intVal = value;
    if (!Number.isInteger(value)) return `G${value}`;
    // Handle codes like G990, G991, G800 etc — keep as-is if > 99
    if (intVal >= 100)
        return `G${intVal}`;
    return `G${intVal.toString().padStart(2, '0')}`;
}
/**
 * Normalize M code number to standard format: M03, M04, M30 etc.
 */
function normalizeMCode(value) {
    const intVal = value;
    if (!Number.isInteger(value)) return `M${value}`;
    if (intVal >= 100)
        return `M${intVal}`;
    return `M${intVal.toString().padStart(2, '0')}`;
}
/**
 * Determine the type of a GCode line based on its G and M codes.
 */
function determineLineType(gCode, mCode) {
    if (gCode !== null) {
        if (MOTION_CODES.has(gCode))
            return 'motion';
        if (SETTING_CODES.has(gCode))
            return 'setting';
        if (CYCLE_CODES.has(gCode))
            return 'cycle';
        if (gCode === 'G04')
            return 'auxiliary';
    }
    if (mCode !== null)
        return 'auxiliary';
    return 'unknown';
}
/**
 * Check if a letter is a valid token type.
 */
function isValidTokenType(letter) {
    const valid = new Set([
        'G', 'M', 'N', 'X', 'Y', 'Z', 'U', 'V', 'W',
        'A', 'B', 'C', 'F', 'S', 'P', 'I', 'K', 'R',
        'L', 'T', 'J', 'Q', 'O',
    ]);
    return valid.has(letter);
}
