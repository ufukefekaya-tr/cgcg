// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import { normalizeMachineProfile } from '../validateInput.js';
/** Static work-coordinate envelope checks. Actual machine travel requires separate verification. */
export function validateSoftLimits(ast, rawProfile) {
    const profile = normalizeMachineProfile(rawProfile);
    const issues = [];
    let absolute = true, units = 1, plane = 'G17';
    const position = { X: null, Y: null, Z: null };
    function check(axis, value, line, arc = false) {
        const key = axis.toLowerCase();
        const min = profile.softLimits[`${key}Min`], max = profile.softLimits[`${key}Max`];
        if (value < min - 0.000001 || value > max + 0.000001) issues.push({ line, severity: 'error', code: `SOFT_LIMIT_${axis}`, message: `${axis}${value} exceeds declared work-coordinate limits [${min}, ${max}]${arc ? ' on arc' : ''}`, details: { axis, value, min, max } });
    }
    for (const line of ast) {
        const gs = line.gCodes ?? [];
        if (gs.some(g => g === 'G90' || g === 'G990')) absolute = true;
        if (gs.some(g => g === 'G91' || g === 'G991')) absolute = false;
        if (gs.includes('G20')) units = 25.4;
        if (gs.includes('G21')) units = 1;
        for (const p of ['G17','G18','G19']) if (gs.includes(p)) plane = p;
        const otherWork = gs.find(g => /^G5[4-9]$/.test(g) && g !== profile.workCoordinate);
        if (otherWork || gs.includes('G92') || gs.includes('G52')) issues.push({ line: line.lineNumber, severity: 'error', code: 'UNSUPPORTED_COORDINATE_FRAME', message: 'Coordinate frame change requires operator verification; declared work-coordinate bounds may not apply.' });
        if (gs.includes('G53')) {
            issues.push({ line: line.lineNumber, severity: 'error', code: 'UNSUPPORTED_MACHINE_COORDINATE', message: 'Machine-coordinate motion is outside these work-coordinate checks.' });
            for (const axis of ['X','Y','Z']) if (axis in line.params) position[axis] = null;
            continue;
        }
        if (line.type !== 'motion') continue; // G04 X is a dwell, not axis travel.
        const start = { ...position };
        for (const axis of ['X','Y','Z']) {
            if (!(axis in line.params)) continue;
            if (!absolute && position[axis] == null) {
                issues.push({ line: line.lineNumber, severity: 'error', code: 'UNSUPPORTED_UNKNOWN_POSITION', message: `Relative ${axis} motion starts at an unknown position.` });
                continue;
            }
            const value = absolute ? line.params[axis] * units : position[axis] + line.params[axis] * units;
            position[axis] = value;
            check(axis, value, line.lineNumber);
        }
        if (!['G02', 'G03'].includes(line.gCode)) continue;
        if (plane !== 'G17' || 'R' in line.params || start.X == null || start.Y == null || !('I' in line.params || 'J' in line.params)) {
            issues.push({ line: line.lineNumber, severity: 'error', code: 'UNSUPPORTED_ARC_ENVELOPE', message: 'Arc envelope could not be checked completely; verify plane, radius, and starting position.' });
            continue;
        }
        const cx = start.X + (line.params.I ?? 0) * units, cy = start.Y + (line.params.J ?? 0) * units;
        const radius = Math.hypot(start.X - cx, start.Y - cy);
        const endRadius = Math.hypot(position.X - cx, position.Y - cy);
        if (radius === 0 || Math.abs(radius - endRadius) > Math.max(0.01, radius * 0.001)) issues.push({ line: line.lineNumber, severity: 'error', code: 'ARC_RADIUS_MISMATCH', message: 'Arc start/end radii do not match.' });
        const tau = 2 * Math.PI;
        const mod = a => (a % tau + tau) % tau;
        const first = Math.atan2(start.Y - cy, start.X - cx), last = Math.atan2(position.Y - cy, position.X - cx);
        const cw = line.gCode === 'G02';
        const sweep = mod(cw ? first - last : last - first);
        const full = Math.hypot(start.X - position.X, start.Y - position.Y) < 0.000001;
        for (const angle of [0, Math.PI/2, Math.PI, 3*Math.PI/2]) {
            const progress = mod(cw ? first - angle : angle - first);
            if (full || progress <= sweep + 0.000001) {
                check('X', cx + radius * Math.cos(angle), line.lineNumber, true);
                check('Y', cy + radius * Math.sin(angle), line.lineNumber, true);
            }
        }
    }
    return issues;
}
