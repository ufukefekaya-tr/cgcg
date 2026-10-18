// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import { normalizeMachineProfile } from '../validateInput.js';
/** Heuristic process checks only; these cannot establish machine safety. */
export function validateSafety(ast, rawProfile) {
    const profile = normalizeMachineProfile(rawProfile);
    const issues = [];
    let active = false;
    for (const line of ast) {
        const m = line.mCodes ?? [], g = line.gCodes ?? [];
        const on = m.includes(profile.mCodes.pourOn), off = m.includes(profile.mCodes.pourOff);
        if (on) active = true;
        if (on && off) issues.push({ line: line.lineNumber, severity: 'error', code: 'CONFLICTING_PROCESS_CODES', message: 'Process on and off occur in one block; execution order is controller-specific.' });
        // Do not infer block execution order from the textual position of M words.
        if (line.gCode === profile.gCodes.rapid) {
            if (active) issues.push({ line: line.lineNumber, severity: 'error', code: 'ANTI_DRIP_VIOLATION', message: 'Rapid block while process output may be active.' });
            if ('X' in line.params && 'Y' in line.params) issues.push({ line: line.lineNumber, severity: 'warning', code: 'DIAGONAL_RAPID', message: 'Rapid block contains both XY axes; verify the travel path.' });
        }
        if (off) active = false;
        if (g.some(code => ['G28','G30'].includes(code))) issues.push({ line: line.lineNumber, severity: 'warning', code: 'REFERENCE_RETURN_UNVERIFIED', message: 'Reference-return movement needs machine-specific verification.' });
    }
    const code = ast.filter(line => !['empty','comment'].includes(line.type) && line.raw.trim() !== '%');
    if (code.length) {
        if (!code.slice(0, 5).some(line => line.gCodes.includes(profile.gCodes.absolute))) issues.push({ line: 1, severity: 'warning', code: 'MISSING_ABSOLUTE_MODE', message: `Initial absolute mode (${profile.gCodes.absolute}) was not found.` });
        if (!code.slice(-3).some(line => line.mCodes.includes(profile.mCodes.programEnd))) issues.push({ line: code.at(-1).lineNumber, severity: 'warning', code: 'MISSING_PROGRAM_END', message: `Program end (${profile.mCodes.programEnd}) was not found.` });
    }
    if (active) issues.push({ line: ast.at(-1)?.lineNumber ?? 1, severity: 'error', code: 'PROCESS_LEFT_ACTIVE', message: 'Process output has no explicit subsequent off; program-end I/O behavior is not assumed.' });
    return issues;
}
