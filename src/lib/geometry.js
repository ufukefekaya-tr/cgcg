// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0
export const patternNames = { rectangleGrid: 'Rectangle grid', circle: 'Circle', linearPath: 'Linear path' };
export const colors = ['#167e77', '#d58c3d', '#7966b7', '#3f83b3', '#b2657b'];

export function geometryCells(entries) {
  return entries.flatMap((entry, index) => {
    const geometry = entry.geometry;
    const cells = [];
    const countX = Math.min(100, Math.max(1, geometry.gridRows || 1));
    const countY = Math.min(100, Math.max(1, geometry.gridCols || 1));
    for (let x = 0; x < countX; x += 1) {
      for (let y = 0; y < countY; y += 1) {
        if (cells.length >= 1000) break;
        cells.push({
          ...geometry, entry: index, key: `${index}-${x}-${y}`,
          x: Number(geometry.startX || 0) + x * (Number(geometry.width || 0) + Number(geometry.gapX || 0)),
          y: Number(geometry.startY || 0) + y * (Number(geometry.height || 0) + Number(geometry.gapY || 0)),
        });
      }
    }
    return cells;
  }).slice(0, 1000);
}

// Bounded XY preview, not a controller emulator. Unmodelled coordinate systems,
// units, compensation, macros and canned cycles suppress the preview entirely.
export function parsedSegments(ast, profile) {
  const limitations = new Set();
  const configuredFrame = profile?.workCoordinate || 'G54';
  const allowed = new Set(['G0','G1','G2','G3','G4','G17','G21','G40','G53',configuredFrame,'G90','G91','G990','G991']);
  const canonical = code => `G${Number(String(code).slice(1))}`;
  for (const node of ast || []) {
    const codes = [...(node.gCodes || []), ...(node.gCode ? [node.gCode] : [])].map(canonical);
    const executable = (node.raw || '').replace(/\([^)]*\)/g,'').split(';')[0];
    if (/[#\[\]]/.test(executable)) return {segments:[],limitations:['Macro expressions are outside this XY preview; no path is displayed.']};
    const unknown = codes.find(code => !allowed.has(code));
    if (unknown) return {segments:[],limitations:[`${unknown} changes units, coordinates, compensation or motion outside this preview. No path is displayed.`]};
    if (Object.keys(node.params || {}).some(key => ['A','B','C','U','V','W'].includes(key))) return {segments:[],limitations:['Rotary or additional axes are outside this XY preview; no path is displayed.']};
  }
  let x = null; let y = null; let absolute = true; let mode = 'G0';
  const segments = [];
  for (const node of ast || []) {
    const params = node.params || {};
    const codes = [...(node.gCodes || []), ...(node.gCode ? [node.gCode] : [])].map(canonical);
    if (codes.includes('G91') || codes.includes('G991')) absolute = false;
    if (codes.includes('G90') || codes.includes('G990')) absolute = true;
    if (codes.includes('G53')) { limitations.add('Machine-coordinate transits are excluded; the next work-coordinate position must be re-established.'); x=null; y=null; continue; }
    if (codes.includes('G4')) continue;
    const motion = codes.find(code => ['G0','G1','G2','G3'].includes(code));
    if (motion) mode = motion;
    const arc = mode==='G2' || mode==='G3';
    if (!('X' in params) && !('Y' in params) && !(arc && ('I' in params || 'J' in params))) continue;
    if (!absolute && (x===null || y===null)) { limitations.add('An incremental start without a known absolute XY position is omitted.'); continue; }
    const toX = 'X' in params ? (absolute ? Number(params.X) : x+Number(params.X)) : x;
    const toY = 'Y' in params ? (absolute ? Number(params.Y) : y+Number(params.Y)) : y;
    if (x===null || y===null) { x=toX; y=toY; limitations.add('The initial approach is omitted until an absolute XY start is known.'); continue; }
    if (![x,y,toX,toY].every(Number.isFinite)) continue;
    if (arc) {
      const i=Number(params.I || 0); const j=Number(params.J || 0);
      const radius=Math.hypot(i,j);
      if (!radius || 'R' in params || 'K' in params) limitations.add('An arc without supported incremental I/J center words is omitted.');
      else {
        const cx=x+i; const cy=y+j;
        if (Math.abs(Math.hypot(toX-cx,toY-cy)-radius)>0.02) limitations.add('An arc with inconsistent endpoint radius is omitted.');
        else {
          const start=Math.atan2(y-cy,x-cx); let end=Math.atan2(toY-cy,toX-cx);
          if (mode==='G2') {while(end>=start-1e-10)end-=Math.PI*2;}
          else {while(end<=start+1e-10)end+=Math.PI*2;}
          let last=[x,y];const count=Math.max(8,Math.ceil(Math.abs(end-start)*12));
          for(let step=1;step<=count;step+=1){const angle=start+(end-start)*step/count;const next=step===count?[toX,toY]:[cx+radius*Math.cos(angle),cy+radius*Math.sin(angle)];segments.push({from:last,to:next,rapid:false});last=next;}
        }
      }
    } else segments.push({from:[x,y],to:[toX,toY],rapid:mode==='G0'});
    x=toX;y=toY;
    if(segments.length>20000){limitations.add('Preview limited to 20,000 segments.');break;}
  }
  return {segments,limitations:[...limitations]};
}
