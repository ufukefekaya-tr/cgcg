// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { engine, createAdapter, normalizeGenerationRequest, normalizeMachineProfile, normalizeInjectionRequest, InputValidationError, DEMO_PROFILE, DEMO_REQUEST } from '../server/engine/index.js';
const copy = value => structuredClone(value);
const request = (patternType = 'rectangleGrid', twoAxis = true) => {
    const value = copy(DEMO_REQUEST);
    value.geometry = { patternType, width: 40, height: 40, startX: 10, startY: 20, gridRows: 2, gridCols: 3, gapX: 15, gapY: 30, cornerRadius: 0 };
    value.use2AxisOnly = twoAxis;
    value.process.use2AxisOnly = twoAxis;
    return value;
};
const coordinateLines = text => text.split('\n').map(line => line.split(';')[0]);
for (const pattern of ['rectangleGrid', 'circle', 'linearPath']) {
    test(`${pattern} two-axis generation has no vertical word or inferred machine return`, () => {
        const result = engine.generate(request(pattern));
        assert.ok(coordinateLines(result.gcode).every(line => !/\bZ[+-]?(?:\d|\.)/i.test(line)));
        assert.doesNotMatch(result.gcode, /G53/);
        assert.doesNotMatch(result.gcode, /undefined|null|NaN|Infinity/);
        assert.equal(result.metadata.totalCells, 6);
        assert.equal(engine.validate(result.gcode, DEMO_PROFILE).valid, true);
    });
}
test('three-axis mode emits explicit vertical clearance and work height', () => {
    const code = engine.generate(request('circle', false)).gcode;
    assert.match(code, /\bZ5\.000\b/);
    assert.match(code, /\bZ0\.000\b/);
});
test('axis mode set only at process level is respected throughout', () => {
    const req = request('linearPath', false); delete req.use2AxisOnly;
    assert.match(engine.generate(req).gcode, /\bZ/);
    req.process.use2AxisOnly = true;
    assert.ok(coordinateLines(engine.generate(req).gcode).every(line => !/\bZ/.test(line)));
});
test('all patterns map rows to X and columns to Y without adding work offsets', () => {
    for (const pattern of ['rectangleGrid', 'circle', 'linearPath']) {
        const req = request(pattern);
        req.machineProfile.workOffset = { x: 500, y: 500, z: 50 };
        const result = engine.generate(req);
        const xy = result.ast.filter(line => line.type === 'motion').flatMap(line => ['X','Y'].filter(axis => axis in line.params).map(axis => [axis, line.params[axis]]));
        assert.ok(Math.max(...xy.filter(([a]) => a === 'X').map(([,v])=>v)) <= 105);
        assert.ok(Math.max(...xy.filter(([a]) => a === 'Y').map(([,v])=>v)) <= 200);
        assert.ok(xy.some(([a,v]) => a === 'Y' && v >= 160));
    }
});
test('unknown controller and multiline code values fail for direct calls', () => {
    const req = request(); req.machineProfile.controllerType = 'unrecognized';
    assert.throws(() => engine.generate(req), InputValidationError);
    assert.throws(() => createAdapter(req.machineProfile), /unsupported controller/);
    const profile = copy(DEMO_PROFILE); profile.mCodes.pourOn = 'M04\nG53 G0 X0';
    assert.throws(() => normalizeMachineProfile(profile), InputValidationError);
});
test('nonfinite, string, negative, and excessive geometry inputs are rejected', () => {
    for (const [key, value] of [['width',NaN],['height',Infinity],['gapX',-1],['startX',-1],['gridRows',0],['gridCols',1.5],['width','40']]) {
        const req = request(); req.geometry[key] = value;
        assert.throws(() => engine.generate(req), InputValidationError, `${key}=${value}`);
    }
    const req = request(); req.geometry.gridRows = 2000; req.geometry.gridCols = 2;
    assert.throws(() => engine.generate(req), InputValidationError);
});
test('table, circle diameter, inner geometry and radius are validated', () => {
    const req = request(); req.geometry.startX = 990;
    assert.throws(() => engine.generate(req), /table/);
    req.geometry.startX = 10; req.geometry.innerGeometry = { enabled:true, width:80, height:10 };
    assert.throws(() => engine.generate(req), /inside/);
    const circle = request('circle'); circle.geometry.radius = 30;
    assert.throws(() => engine.generate(circle), /diameter/);
});
test('operator machine return is opt-in and verified', () => {
    assert.equal(createAdapter(DEMO_PROFILE).machineZero(), null);
    const req = request(); req.machineProfile.operatorVerifiedMachineZero = { verified:true, command:'G53 G0 X0 Y0' };
    assert.match(engine.generate(req).gcode, /G53 G0 X0 Y0/);
    req.machineProfile.operatorVerifiedMachineZero.verified = false;
    assert.throws(() => engine.generate(req), /explicitly true/);
    req.machineProfile.operatorVerifiedMachineZero = { verified:true, command:'G53 G0 X0\nM30' };
    assert.throws(() => engine.generate(req), /single-line/);
});
test('vertical operator command is rejected in two-axis mode', () => {
    const req = request(); req.machineProfile.operatorVerifiedMachineZero = { verified:true, command:'G53 G0 Z0' };
    assert.throws(() => engine.generate(req), /two-axis/);
});
test('multi-geometry sequence and axis consistency are preserved', () => {
    const req = request();
    req.geometries = [{ geometry:req.geometry, process:req.process, sequence:2 }, { geometry:{...req.geometry,startX:200}, process:req.process, sequence:1 }];
    const result = engine.generate(req);
    assert.equal(result.metadata.totalCells,12);
    assert.ok(result.gcode.indexOf('; --- GEOMETRY 1') < result.gcode.indexOf('; --- GEOMETRY 2'));
    req.geometries[1].process = {...req.process,use2AxisOnly:false};
    assert.throws(() => normalizeGenerationRequest(req), /axis mode/);
});
test('XY arcs use I/J and rounded rectangles retain matching radii', () => {
    const req = request(); req.geometry.cornerRadius = 5;
    const code = engine.generate(req).gcode;
    assert.doesNotMatch(coordinateLines(code).join('\n'), /\bK/);
    assert.match(code, /G03 .*J/);
    assert.equal(engine.validate(code,DEMO_PROFILE).valid,true);
});
test('parser/serializer preserve modal words, program number, delimiters and inline comments', () => {
    const text = '%\nO4321\n(note) G17 G21 G90\nG0 X10 Y20\nG1 X30 F100 ; feed\nY40\nM5 M9\nM30\n%';
    const serialized = engine.serialize(engine.parse(text));
    assert.match(serialized,/O4321/); assert.equal(serialized.match(/^%$/gm).length,2);
    assert.match(serialized,/G17 G21 G90/); assert.match(serialized,/M05 M09/);
    assert.equal(engine.parse(text).find(line=>line.raw==='Y40').gCode,'G01');
    assert.equal(engine.validate(serialized,DEMO_PROFILE).valid,true);
});
test('static limits accumulate relative motion and convert inch positions', () => {
    const relative = engine.validate('G90 G1 X900\nG91\nG1 X200\nM30',DEMO_PROFILE);
    assert.equal(relative.valid,false); assert.ok(relative.issues.some(i=>i.code==='SOFT_LIMIT_X' && i.details.value===1100));
    const inches = engine.validate('G90 G20\nG1 X40\nM30',DEMO_PROFILE);
    assert.equal(inches.valid,false); assert.ok(inches.issues.some(i=>i.code==='SOFT_LIMIT_X'));
});
test('arc extrema outside declared limits are rejected although endpoints fit', () => {
    const result = engine.validate('G90 G17 G21\nG0 X990 Y500\nG2 X990 Y500 I20 J0\nM30',DEMO_PROFILE);
    assert.equal(result.valid,false); assert.ok(result.issues.some(i=>i.code==='SOFT_LIMIT_X'));
});
test('unsupported modes, macros, radius arcs and machine coordinates are explicit errors', () => {
    for (const text of ['G53 G0 X0','G81 X20 Y20','G1 X[100+2]','G18 G2 X20 Z30 I5 K5','G90\nG0 X20 Y20\nG2 X40 Y20 R10','G91\nG1 X5','G90\nG0 X0 Y0\nG1 A20']) {
        const result = engine.validate(text,DEMO_PROFILE);
        assert.equal(result.valid,false,text);
        assert.ok(result.issues.some(i=>i.severity==='error' && i.code.startsWith('UNSUPPORTED_')),text);
    }
});
test('dwell X duration is not treated as work-coordinate motion', () => {
    assert.equal(engine.validate('G90\nG4 X2000\nM30',DEMO_PROFILE).issues.some(i=>i.code==='SOFT_LIMIT_X'),false);
});
test('injection preserves untouched program semantics and uses controller dwell dialect', () => {
    const original = '%\nO1001\nG17 G21 G90\nG0 X10 Y10\nM4\nG1 X20 F100\nM5\nM30\n%';
    const profile = {...copy(DEMO_PROFILE),controllerType:'falcon'};
    const result = engine.inject(original,{ruleType:'addPreDwell',params:{durationMs:1500}},profile);
    assert.equal(result.changeCount,1); assert.match(result.gcode,/G04 X1\.5/);
    assert.match(result.gcode,/O1001/); assert.match(result.gcode,/G17 G21 G90/);
    assert.equal(result.gcode.match(/^%$/gm).length,2);
    const changed = engine.inject(original,{ruleType:'changeFeedrate',params:{feedRate:200}},profile);
    assert.match(changed.gcode,/G1 X20 F200/);
});
test('injection rejects unknown rules, invalid values, and implicit vertical motion', () => {
    assert.throws(()=>engine.inject('M30',{ruleType:'typo',params:{}},DEMO_PROFILE),InputValidationError);
    assert.throws(()=>engine.inject('M30',{ruleType:'changeFeedrate',params:{feedRate:-1}},DEMO_PROFILE),InputValidationError);
    assert.throws(()=>engine.inject('G0 X10',{ruleType:'insertSafeZ',params:{}},DEMO_PROFILE),/use2AxisOnly:false/);
    const injected = engine.inject('G0 X10',{ruleType:'insertSafeZ',params:{}},DEMO_PROFILE,{use2AxisOnly:false});
    assert.match(injected.gcode,/Z5\.000/);
    assert.throws(()=>engine.inject('G1 X[2+3]',{ruleType:'changeFeedrate',params:{feedRate:100}},DEMO_PROFILE),/unsupported/);
});
test('early close handles an actual zero start and preserves final endpoint', () => {
    const result = engine.inject('G90\nG0 X0 Y0\nM4\nG1 X100 F500\nM5\nM30',{ruleType:'addEarlyClose',params:{distanceMm:10}},DEMO_PROFILE);
    assert.equal(result.changeCount,1); assert.match(result.gcode,/X90\.000 Y0\.000/);
    const moves = result.ast.filter(line=>line.gCode==='G01');
    assert.equal(moves.at(-1).params.X,100);
    assert.throws(()=>engine.inject('G91\nG0 X0 Y0\nM4\nG1 X100 F500\nM5',{ruleType:'addEarlyClose',params:{distanceMm:10}},DEMO_PROFILE),/absolute/);
});
test('canonical HTTP injection shape normalizes to the direct engine rule', () => {
    const result = normalizeInjectionRequest({gcode:'M30',machineProfile:DEMO_PROFILE,injection:{type:'changeFeedrate',feedRate:200}});
    assert.deepEqual(result.rule,{ruleType:'changeFeedrate',params:{feedRate:200}});
});

test('program end does not imply that process output was shut off', () => {
    const result = engine.validate('G90\nM4\nG1 X10 F100\nM30',DEMO_PROFILE);
    assert.equal(result.valid,false);
    assert.ok(result.issues.some(i=>i.code==='PROCESS_LEFT_ACTIVE'));
});
