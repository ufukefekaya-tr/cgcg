// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/** Bounded validation shared by HTTP callers and direct engine consumers. */
const CONTROLLERS = new Set(['generic', 'falcon', 'fanuc', 'siemens']);
const PATTERNS = new Set(['rectangleGrid', 'circle', 'linearPath']);
const MAX_COORDINATE = 1_000_000;
const MAX_CELLS = 2000;
const MAX_DURATION = 3_600_000;
const has = (o, k) => Object.hasOwn(o, k);
export class InputValidationError extends TypeError {
    constructor(message) { super(message); this.name = 'InputValidationError'; }
}
function fail(path, message) { throw new InputValidationError(`${path}: ${message}`); }
function record(value, path) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(path, 'must be an object');
    for (const key of ['__proto__', 'prototype', 'constructor']) if (has(value, key)) fail(path, 'reserved property');
    return value;
}
function number(value, path, min = -MAX_COORDINATE, max = MAX_COORDINATE, fallback) {
    if (value === undefined && fallback !== undefined) value = fallback;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(path, `must be a finite number in [${min}, ${max}]`);
    return value;
}
function integer(value, path, min, max, fallback) {
    const out = number(value, path, min, max, fallback);
    if (!Number.isInteger(out)) fail(path, 'must be an integer');
    return out;
}
function bool(value, path, fallback = false) {
    if (value === undefined) return fallback;
    if (typeof value !== 'boolean') fail(path, 'must be a boolean');
    return value;
}
function text(value, path, max = 100) {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) fail(path, 'must be nonempty single-line text');
    return value;
}
function code(value, prefix, path) {
    if (typeof value !== 'string' || !new RegExp(`^${prefix}\\d{1,3}$`).test(value)) fail(path, `must be a single ${prefix} code`);
    return `${prefix}${Number(value.slice(1)).toString().padStart(2, '0')}`;
}
export function normalizeMachineProfile(raw) {
    const p = record(raw, 'machineProfile');
    if (!CONTROLLERS.has(p.controllerType)) fail('machineProfile.controllerType', 'unsupported controller');
    const table = record(p.table, 'machineProfile.table');
    const soft = record(p.softLimits, 'machineProfile.softLimits');
    const offset = record(p.workOffset, 'machineProfile.workOffset');
    const out = {
        name: text(p.name, 'machineProfile.name'), controllerType: p.controllerType,
        table: { width: number(table.width, 'table.width', 0.001), height: number(table.height, 'table.height', 0.001) },
        softLimits: {}, workOffset: {},
        safeHeight: number(p.safeHeight, 'machineProfile.safeHeight'),
        workCoordinate: code(p.workCoordinate, 'G', 'machineProfile.workCoordinate'),
        rapidSpeed: number(p.rapidSpeed, 'machineProfile.rapidSpeed', 0.001),
        defaultFeedRate: number(p.defaultFeedRate, 'machineProfile.defaultFeedRate', 0.001),
        mCodes: {}, gCodes: {}, operatorVerifiedMachineZero: null,
    };
    if (p.id !== undefined) out.id = text(p.id, 'machineProfile.id');
    if (!/^G5[4-9]$/.test(out.workCoordinate)) fail('machineProfile.workCoordinate', 'expected G54 through G59');
    for (const axis of ['x', 'y', 'z']) {
        out.softLimits[`${axis}Min`] = number(soft[`${axis}Min`], `softLimits.${axis}Min`);
        out.softLimits[`${axis}Max`] = number(soft[`${axis}Max`], `softLimits.${axis}Max`);
        if (out.softLimits[`${axis}Min`] >= out.softLimits[`${axis}Max`]) fail(`softLimits.${axis}`, 'minimum must be less than maximum');
        out.workOffset[axis] = number(offset[axis], `workOffset.${axis}`);
    }
    if (out.safeHeight < out.softLimits.zMin || out.safeHeight > out.softLimits.zMax) fail('machineProfile.safeHeight', 'outside declared work-coordinate limits');
    const m = record(p.mCodes, 'machineProfile.mCodes');
    for (const key of ['pourOn','pourOff','washOn','washOff','blowOn','blowOff','coolantOn','coolantOff','programEnd','spindleCW']) out.mCodes[key] = code(m[key], 'M', `mCodes.${key}`);
    for (const [on, off] of [['pourOn','pourOff'], ['washOn','washOff'], ['blowOn','blowOff'], ['coolantOn','coolantOff']]) if (out.mCodes[on] === out.mCodes[off]) fail('machineProfile.mCodes', `${on} and ${off} must differ`);
    const g = record(p.gCodes, 'machineProfile.gCodes');
    const allowed = { rapid: ['G00'], linear: ['G01'], arcCW: ['G02'], arcCCW: ['G03'], absolute: ['G90','G990'], relative: ['G91','G991'], dwell: ['G04'], machineCoord: ['G53'] };
    for (const [key, values] of Object.entries(allowed)) {
        out.gCodes[key] = code(g[key], 'G', `gCodes.${key}`);
        if (!values.includes(out.gCodes[key])) fail(`gCodes.${key}`, `expected ${values.join(' or ')}`);
    }
    if (p.operatorVerifiedMachineZero != null) {
        const verified = record(p.operatorVerifiedMachineZero, 'operatorVerifiedMachineZero');
        if (verified.verified !== true) fail('operatorVerifiedMachineZero.verified', 'must be explicitly true');
        const command = text(verified.command, 'operatorVerifiedMachineZero.command', 200).trim();
        // Only the operator-approved machine-coordinate rapid is accepted here.
        // No canned return cycle or implicit homing command is manufactured.
        if (!/^G53\s+G0{1,2}(?:\s+[XYZ][+-]?(?:\d+(?:\.\d*)?|\.\d+)){1,3}$/i.test(command)) fail('operatorVerifiedMachineZero.command', 'expected a single G53 G0 axis-position command');
        const axes = [...command.matchAll(/\b([XYZ])([+-]?(?:\d+(?:\.\d*)?|\.\d+))/gi)];
        if (new Set(axes.map(a => a[1].toUpperCase())).size !== axes.length) fail('operatorVerifiedMachineZero.command', 'duplicate axis');
        for (const [, axis, value] of axes) number(Number(value), `operatorVerifiedMachineZero.${axis}`);
        out.operatorVerifiedMachineZero = { verified: true, command: command.toUpperCase() };
    }
    return out;
}
function normalizeGeometry(raw, index) {
    const p = `geometry[${index}]`;
    const g = record(raw, p);
    if (!PATTERNS.has(g.patternType)) fail(`${p}.patternType`, 'unsupported pattern');
    const out = {
        patternType: g.patternType, width: number(g.width, `${p}.width`, 0.001),
        height: number(g.height, `${p}.height`, 0.001),
        startX: number(g.startX, `${p}.startX`, 0, MAX_COORDINATE, 0),
        startY: number(g.startY, `${p}.startY`, 0, MAX_COORDINATE, 0),
        gridRows: integer(g.gridRows, `${p}.gridRows`, 1, MAX_CELLS, 1),
        gridCols: integer(g.gridCols, `${p}.gridCols`, 1, MAX_CELLS, 1),
        gapX: number(g.gapX, `${p}.gapX`, 0, MAX_COORDINATE, 0),
        gapY: number(g.gapY, `${p}.gapY`, 0, MAX_COORDINATE, 0),
        cornerRadius: number(g.cornerRadius, `${p}.cornerRadius`, 0, MAX_COORDINATE, 0),
    };
    if (out.cornerRadius > 0 && out.cornerRadius >= Math.min(out.width, out.height) / 2) fail(`${p}.cornerRadius`, 'must be smaller than half of either dimension');
    if (g.patternType === 'circle') {
        out.radius = number(g.radius, `${p}.radius`, 0.001, MAX_COORDINATE, out.width / 2);
        if (out.radius * 2 > Math.min(out.width, out.height)) fail(`${p}.radius`, 'diameter must fit both cell dimensions');
    }
    if (g.innerGeometry !== undefined) {
        const inner = record(g.innerGeometry, `${p}.innerGeometry`);
        out.innerGeometry = { enabled: bool(inner.enabled, `${p}.innerGeometry.enabled`) };
        if (out.innerGeometry.enabled) {
            if (out.patternType !== 'rectangleGrid') fail(`${p}.innerGeometry`, 'supported only for rectangleGrid');
            out.innerGeometry.width = number(inner.width, `${p}.innerGeometry.width`, 0.001);
            out.innerGeometry.height = number(inner.height, `${p}.innerGeometry.height`, 0.001);
            out.innerGeometry.cornerRadius = number(inner.cornerRadius, `${p}.innerGeometry.cornerRadius`, 0, MAX_COORDINATE, 0);
            if (out.innerGeometry.width >= out.width || out.innerGeometry.height >= out.height) fail(`${p}.innerGeometry`, 'must be strictly inside the outer rectangle');
            if (out.innerGeometry.cornerRadius > 0 && out.innerGeometry.cornerRadius >= Math.min(out.innerGeometry.width, out.innerGeometry.height) / 2) fail(`${p}.innerGeometry.cornerRadius`, 'too large');
        }
    }
    return out;
}
function normalizeProcess(raw, index, twoAxis, defaultFeedRate) {
    const p = `process[${index}]`;
    const value = record(raw, p);
    const out = { feedRate: number(value.feedRate, `${p}.feedRate`, 0.001, MAX_COORDINATE, defaultFeedRate) };
    for (const key of ['dryRun','forceExplicitF','washEnabled','blowEnabled','earlyCloseEnabled','prePourPrimingEnabled']) out[key] = bool(value[key], `${p}.${key}`, key === 'dryRun');
    out.use2AxisOnly = bool(value.use2AxisOnly, `${p}.use2AxisOnly`, twoAxis);
    for (const key of ['preDwell','postDwell','motionPreDelay','interGeometryDelay','washDuration','blowDuration','prePourPrimingDuration']) out[key] = number(value[key], `${p}.${key}`, 0, MAX_DURATION, 0);
    out.earlyCloseDistance = number(value.earlyCloseDistance, `${p}.earlyCloseDistance`, 0, MAX_COORDINATE, 0);
    for (const [enabled, duration] of [['washEnabled','washDuration'],['blowEnabled','blowDuration'],['prePourPrimingEnabled','prePourPrimingDuration']]) if (out[enabled] && out[duration] <= 0) fail(`${p}.${duration}`, `must be positive when ${enabled}`);
    if (out.dryRun && (out.washEnabled || out.blowEnabled || out.prePourPrimingEnabled)) fail(p, 'dryRun cannot activate wash, blow, or priming');
    return out;
}
export function normalizeGenerationRequest(raw) {
    const c = record(raw, 'request');
    const machineProfile = normalizeMachineProfile(c.machineProfile);
    const twoAxis = bool(c.use2AxisOnly, 'use2AxisOnly', true);
    let inputs;
    if (c.geometries !== undefined) {
        if (!Array.isArray(c.geometries) || c.geometries.length < 1 || c.geometries.length > 50) fail('geometries', 'must contain 1 through 50 entries');
        inputs = c.geometries;
    } else inputs = [{ geometry: c.geometry, process: c.process, sequence: 0 }];
    let count = 0;
    const geometries = inputs.map((rawEntry, index) => {
        const entry = record(rawEntry, `geometries[${index}]`);
        const geometry = normalizeGeometry(entry.geometry, index);
        const process = normalizeProcess(entry.process, index, twoAxis, machineProfile.defaultFeedRate);
        count += geometry.gridRows * geometry.gridCols;
        const maxX = geometry.startX + geometry.gridRows * geometry.width + (geometry.gridRows - 1) * geometry.gapX;
        const maxY = geometry.startY + geometry.gridCols * geometry.height + (geometry.gridCols - 1) * geometry.gapY;
        if (maxX > machineProfile.table.width || maxY > machineProfile.table.height) fail(`geometry[${index}]`, 'extends outside the declared work table');
        if (geometry.startX < machineProfile.softLimits.xMin || maxX > machineProfile.softLimits.xMax || geometry.startY < machineProfile.softLimits.yMin || maxY > machineProfile.softLimits.yMax) fail(`geometry[${index}]`, 'extends outside declared work-coordinate limits');
        if (!process.use2AxisOnly && (machineProfile.softLimits.zMin > 0 || machineProfile.softLimits.zMax < 0)) fail(`process[${index}]`, 'work height 0 is outside declared limits');
        if (process.use2AxisOnly && /\bZ[+-]?\d/i.test(machineProfile.operatorVerifiedMachineZero?.command ?? '')) fail('operatorVerifiedMachineZero.command', 'vertical motion conflicts with two-axis mode');
        if (process.prePourPrimingEnabled && !machineProfile.operatorVerifiedMachineZero) fail(`process[${index}].prePourPrimingEnabled`, 'requires an explicit operator-verified machine position');
        const closingGeometry = geometry.innerGeometry?.enabled ? geometry.innerGeometry : geometry;
        const closingLength = geometry.patternType === 'circle' ? 2 * Math.PI * geometry.radius : geometry.patternType === 'linearPath' ? Math.hypot(geometry.width, geometry.height) : closingGeometry.height - 2 * closingGeometry.cornerRadius;
        if (process.earlyCloseEnabled && (process.earlyCloseDistance <= 0 || process.earlyCloseDistance >= closingLength)) fail(`process[${index}].earlyCloseDistance`, 'must be positive and less than the closing segment');
        return { geometry, process, sequence: integer(entry.sequence, `geometries[${index}].sequence`, 0, 1_000_000, index) };
    }).sort((a, b) => a.sequence - b.sequence);
    if (count > MAX_CELLS) fail('geometries', `total grid cells exceed ${MAX_CELLS}`);
    // A program has one axis mode: reject ambiguous mixed geometry settings.
    const use2AxisOnly = geometries[0].process.use2AxisOnly;
    if (geometries.some(e => e.process.use2AxisOnly !== use2AxisOnly)) fail('use2AxisOnly', 'all geometries must use the same axis mode');
    if (c.use2AxisOnly !== undefined && use2AxisOnly !== twoAxis) fail('use2AxisOnly', 'top-level and process axis mode disagree');
    return { machineProfile, use2AxisOnly, geometries, geometry: geometries[0].geometry, process: geometries.at(-1).process };
}
export function normalizeGcode(value) {
    if (typeof value !== 'string' || value.length > 1_000_000 || value.split('\n').length > 50_000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) fail('gcode', 'must be text within 1 MB and 50000 lines, without control characters');
    return value;
}
export function normalizeInjectionRequest(raw) {
    const req = record(raw, 'request');
    const machineProfile = normalizeMachineProfile(req.machineProfile);
    const input = record(req.rule ?? req.injection, 'injection');
    const ruleType = input.ruleType ?? input.type;
    const params = record(input.params ?? input, 'injection.params');
    const rule = { ruleType, params: {} };
    switch (ruleType) {
        case 'addWashBlock': case 'addPreDwell': case 'addPostDwell': case 'addPrimingBlock':
            rule.params.durationMs = number(params.durationMs, 'injection.durationMs', 0.001, MAX_DURATION, ruleType === 'addWashBlock' ? 3000 : ruleType === 'addPrimingBlock' ? 2000 : 500); break;
        case 'changeFeedrate': rule.params.feedRate = number(params.feedRate, 'injection.feedRate', 0.001); break;
        case 'changeMCode': rule.params.oldMCode = code(params.oldMCode, 'M', 'injection.oldMCode'); rule.params.newMCode = code(params.newMCode, 'M', 'injection.newMCode'); break;
        case 'addEarlyClose': rule.params.distanceMm = number(params.distanceMm, 'injection.distanceMm', 0.001, MAX_COORDINATE, 5); break;
        case 'insertSafeZ': break;
        default: fail('injection.type', 'unsupported injection rule');
    }
    const use2AxisOnly = bool(req.use2AxisOnly, 'use2AxisOnly', true);
    if (ruleType === 'insertSafeZ' && use2AxisOnly) fail('injection.type', 'insertSafeZ requires explicit use2AxisOnly:false');
    return { gcode: normalizeGcode(req.gcode), rule, machineProfile, use2AxisOnly };
}
export const validateInjectionRequest = normalizeInjectionRequest;
