// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/parser/GCodeSerializer.ts
 * Serializes GCodeAST back to G-Code string.
 * Preserves original formatting where possible, reconstructs from AST otherwise.
 */
// Parameter output order for deterministic serialization
const PARAM_ORDER = ['O', 'X', 'Y', 'Z', 'U', 'V', 'W', 'A', 'B', 'C', 'I', 'K', 'R', 'F', 'S', 'P', 'L', 'T', 'J', 'Q'];
/**
 * Serialize a GCodeAST back to a multi-line G-Code string.
 * @param preserveRaw If true, uses the original raw string for unchanged lines.
 */
export function serialize(ast, preserveRaw = false) {
    if (!Array.isArray(ast) || ast.length > 50000) throw new TypeError('AST must be an array of at most 50000 lines');
    return ast.map((line) => serializeLine(line, preserveRaw)).join('\n');
}
/**
 * Serialize a single GCodeLine to string.
 * If preserveRaw is true and the line is unmodified (has original raw string), prefer it.
 */
function serializeLine(line, preserveRaw) {
    if (typeof line?.raw === 'string' && /^%\s*(?:;.*)?$/.test(line.raw.trim())) return line.raw;
    // Empty lines
    if (line.type === 'empty')
        return '';
    // Pure comment lines
    if (line.type === 'comment' && line.gCode === null && line.mCode === null) {
        if (line.comment !== null)
            return `; ${line.comment}`;
        return line.raw;
    }
    // Preserve raw format if requested and raw exists
    if (preserveRaw && line.raw) {
        return line.raw;
    }
    const parts = [];
    // Line number (N word)
    // Only emit if original had an explicit N
    if (line.raw.match(/N\d/i)) {
        parts.push(`N${line.lineNumber.toString().padStart(4, '0')}`);
    }
    // G code
    const gs = line.gCodes?.length ? line.gCodes : (line.gCode ? [line.gCode] : []);
    parts.push(...gs);
    // M code
    const ms = line.mCodes?.length ? line.mCodes : (line.mCode ? [line.mCode] : []);
    parts.push(...ms);
    // Parameters in deterministic order
    for (const key of PARAM_ORDER) {
        if (key in line.params) {
            parts.push(formatParam(key, line.params[key]));
        }
    }
    // Any remaining params not in standard order
    for (const key of Object.keys(line.params)) {
        if (!PARAM_ORDER.includes(key)) {
            parts.push(formatParam(key, line.params[key]));
        }
    }
    let result = parts.join(' ');
    // Inline comment
    if (line.comment !== null && line.type !== 'comment') {
        result += ` ; ${line.comment}`;
    }
    return result;
}
/**
 * Format a parameter key-value pair.
 * Integers are emitted without decimals, floats with up to 3 decimal places.
 */
function formatParam(key, value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('AST parameter must be finite');
    if (Number.isInteger(value)) {
        return `${key}${value}`;
    }
    return `${key}${value.toFixed(3)}`;
}
