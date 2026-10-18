// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { parsedSegments, geometryCells } from './geometry.js';
const line=(gCode,params={})=>({gCode,gCodes:[gCode],params});

test('preview suppresses unmodelled units, frames, compensation and cycles',()=>{
  for(const code of ['G20','G92','G55','G41','G81','G18']){
    const result=parsedSegments([line('G00',{X:10,Y:10}),line('G01',{X:20}),line(code)],{workCoordinate:'G54'});
    assert.deepEqual(result.segments,[]);assert.ok(result.limitations.length);
  }
});
test('preview omits unknown approach and dwell X while tracking incremental XY',()=>{
  const result=parsedSegments([line('G00',{X:10,Y:20}),line('G04',{X:2}),line('G91'),line('G01',{X:5,Y:-3})]);
  assert.deepEqual(result.segments,[{from:[10,20],to:[15,17],rapid:false}]);
});
test('machine-coordinate transit does not invent a connection to the next work move',()=>{
  const result=parsedSegments([line('G00',{X:10,Y:20}),{gCode:'G00',gCodes:['G53','G00'],params:{X:0,Y:0}},line('G00',{X:30,Y:40}),line('G01',{X:50})]);
  assert.deepEqual(result.segments,[{from:[30,40],to:[50,40],rapid:false}]);
});
test('full circle using I/J has full sampled extent',()=>{
  const result=parsedSegments([line('G00',{X:20,Y:10}),line('G02',{I:-10,J:0})]);
  assert.ok(result.segments.length>30);
  const points=result.segments.flatMap(segment=>[segment.from,segment.to]);
  assert.ok(Math.min(...points.map(point=>point[0]))<0.05);
  assert.ok(Math.min(...points.map(point=>point[1]))<0.05);
  assert.deepEqual(result.segments.at(-1).to,[20,10]);
});
test('geometry repeats X and Y consistently for every pattern',()=>{
  for(const patternType of ['rectangleGrid','circle','linearPath']){
    const cells=geometryCells([{geometry:{patternType,width:20,height:10,gridRows:2,gridCols:3,startX:5,startY:6,gapX:4,gapY:2}}]);
    assert.equal(cells.length,6);assert.equal(Math.max(...cells.map(cell=>cell.x)),29);assert.equal(Math.max(...cells.map(cell=>cell.y)),30);
  }
});
