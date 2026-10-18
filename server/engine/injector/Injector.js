// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/** Bounded text-preserving transformations. These are drafts, not machine verification. */
import { parse } from '../parser/GCodeParser.js';
import { serialize } from '../parser/GCodeSerializer.js';
import { InputValidationError, normalizeInjectionRequest } from '../validateInput.js';
import { validateSyntax } from '../validators/SyntaxValidator.js';
import { createAdapter } from '../adapters/ControllerAdapter.js';
const contains = (line, kind, code) => (line[kind] ?? []).includes(code);
const sameCode = (a, b) => Number(a.slice(1)) === Number(b.slice(1));
export function inject(gcode, rule, profile, options = {}) {
    const request = normalizeInjectionRequest({ gcode, rule, machineProfile: profile, ...options });
    const adapter = createAdapter(request.machineProfile);
    const ast = parse(request.gcode);
    const syntaxErrors = validateSyntax(ast, request.machineProfile).filter(issue => issue.severity === 'error');
    if (syntaxErrors.length) throw new InputValidationError(`Cannot inject unsupported G-code: ${syntaxErrors[0].message}`);
    const params = request.rule.params;
    const kind = request.rule.ruleType;
    const output = [];
    let changeCount = 0;
    const on = request.machineProfile.mCodes.pourOn;
    const off = request.machineProfile.mCodes.pourOff;
    const dwellCode = request.machineProfile.gCodes.dwell;
    const isOn = line => contains(line, 'mCodes', on);
    const isOff = line => contains(line, 'mCodes', off);
    const append = text => output.push(...parse(text));
    const dwell = () => adapter.dwell(params.durationMs);
    if (kind === 'addEarlyClose') return earlyClose(ast, request.machineProfile, params.distanceMm);
    let primed = false;
    for (let i = 0; i < ast.length; i++) {
        const line = ast[i];
        if (kind === 'changeFeedrate' && Object.hasOwn(line.params, 'F')) {
            const raw = line.raw.replace(/^[^;]*/, code => code.replace(/F[+-]?(?:\d*\.\d+|\d+\.?\d*)/ig, `F${params.feedRate}`));
            append(raw); changeCount++; continue;
        }
        if (kind === 'changeMCode' && line.mCodes.some(m => sameCode(m, params.oldMCode))) {
            const raw = line.raw.replace(/^[^;]*/, code => code.replace(/M\d+/ig, m => sameCode(m, params.oldMCode) ? params.newMCode : m));
            append(raw); changeCount++; continue;
        }
        if (kind === 'addPrimingBlock' && !primed && (line.type === 'motion' || isOn(line))) {
            // Explicit position required: a priming injection never infers a return location.
            const command = adapter.machineZero();
            if (!command) throw new InputValidationError('Priming requires an explicit operator-verified machine position');
            if (request.use2AxisOnly && /\bZ[+-]?\d/i.test(command)) throw new InputValidationError('Priming machine command conflicts with two-axis mode');
            append(`${command}\n${adapter.pourOn()}\n${dwell()}\n${adapter.pourOff()}\n${adapter.workCoord()}`);
            primed = true; changeCount++;
        }
        if (kind === 'insertSafeZ' && line.gCode === request.machineProfile.gCodes.rapid && ('X' in line.params || 'Y' in line.params)) {
            const prev = output.at(-1);
            if (!(prev?.gCode === request.machineProfile.gCodes.rapid && prev.params.Z === request.machineProfile.safeHeight && !('X' in prev.params) && !('Y' in prev.params))) {
                append(`${adapter.rapid()} ${adapter.formatCoord('Z', request.machineProfile.safeHeight)} ; Configured vertical clearance (injected)`); changeCount++;
            }
        }
        if (kind === 'addPreDwell' && isOn(line)) {
            if (output.at(-1)?.gCode === dwellCode) output.pop();
            append(dwell()); changeCount++;
        }
        output.push(line);
        if (kind === 'addPostDwell' && isOff(line)) {
            append(dwell()); changeCount++;
            if (ast[i + 1]?.gCode === dwellCode) i++;
        }
        if (kind === 'addWashBlock' && isOff(line)) {
            append(`${adapter.washOn()}\n${dwell()}\n${adapter.washOff()}`); changeCount++;
        }
    }
    return result(output, changeCount);
}
function result(ast, changeCount) {
    const gcode = serialize(ast, true);
    return { gcode, ast: parse(gcode), changeCount, requiresOperatorReview: true };
}
function earlyClose(ast, profile, distance) {
    const resultLines = [];
    let x = null, y = null, absolute = null, pouring = false, changes = 0;
    for (let index = 0; index < ast.length; index++) {
        const line = ast[index];
        if (contains(line, 'gCodes', profile.gCodes.relative) || contains(line, 'gCodes', 'G91') || contains(line, 'gCodes', 'G991')) absolute = false;
        if (contains(line, 'gCodes', profile.gCodes.absolute) || contains(line, 'gCodes', 'G90') || contains(line, 'gCodes', 'G990')) absolute = true;
        if (contains(line, 'gCodes', 'G20') || contains(line, 'gCodes', 'G53') || contains(line, 'gCodes', 'G92')) throw new InputValidationError('Early close supports millimetre absolute work coordinates only');
        if (line.mCodes.includes(profile.mCodes.pourOn)) pouring = true;
        const startX = x, startY = y;
        if (line.type === 'motion') {
            if ('X' in line.params) x = absolute === false && x != null ? x + line.params.X : line.params.X;
            if ('Y' in line.params) y = absolute === false && y != null ? y + line.params.Y : line.params.Y;
        }
        const next = ast[index + 1];
        if (pouring && line.gCode === profile.gCodes.linear && next?.mCodes.includes(profile.mCodes.pourOff)) {
            if (absolute !== true || startX == null || startY == null || x == null || y == null || 'Z' in line.params) throw new InputValidationError('Early close requires explicit absolute mode and known XY start coordinates');
            const length = Math.hypot(x - startX, y - startY);
            if (distance >= length) throw new InputValidationError('Early close distance must be less than the final linear segment');
            const ratio = (length - distance) / length;
            const stopX = startX + ratio * (x - startX), stopY = startY + ratio * (y - startY);
            const feed = line.modalFeedRate == null ? '' : ` F${line.modalFeedRate}`;
            const text = `${profile.gCodes.linear} X${stopX.toFixed(3)} Y${stopY.toFixed(3)}${feed}\n${next.raw}\n${profile.gCodes.linear} X${x.toFixed(3)} Y${y.toFixed(3)}${feed}`;
            resultLines.push(...parse(text)); changes++; index++; pouring = false; continue;
        }
        if (line.mCodes.includes(profile.mCodes.pourOff)) pouring = false;
        resultLines.push(line);
    }
    return result(resultLines, changes);
}
