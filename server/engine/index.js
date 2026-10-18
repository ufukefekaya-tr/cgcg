// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/** Dependency-free public API. All results require machine-specific operator review. */
import { generate } from './generator/ParametricGenerator.js';
import { parse } from './parser/GCodeParser.js';
import { serialize } from './parser/GCodeSerializer.js';
import { inject } from './injector/Injector.js';
import { normalizeMachineProfile } from './validateInput.js';
import { validateSoftLimits } from './validators/SoftLimitValidator.js';
import { validateSyntax } from './validators/SyntaxValidator.js';
import { validateSafety } from './validators/SafetyValidator.js';
export function validate(gcode, rawProfile) {
    const profile = normalizeMachineProfile(rawProfile);
    const ast = parse(gcode);
    const issues = [...validateSoftLimits(ast, profile), ...validateSyntax(ast, profile), ...validateSafety(ast, profile)];
    return { valid: issues.every(i => i.severity !== 'error'), issues, requiresOperatorReview: true, scope: 'Static checks only; no machine, fixture, controller, or I/O verification.' };
}
export const engine = { generate, parse, serialize, inject, validate };
export { generate, parse, serialize, inject, validateSoftLimits, validateSyntax, validateSafety };
export { createAdapter } from './adapters/ControllerAdapter.js';
export { InputValidationError, normalizeGenerationRequest, normalizeMachineProfile, normalizeInjectionRequest, validateInjectionRequest } from './validateInput.js';
export * from './defaults.js';
