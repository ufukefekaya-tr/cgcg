// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
// Reproduce public examples from synthetic profiles; never reads user jobs.
import {mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {engine, DEMO_REQUEST} from '../server/engine/index.js';
import {parsedSegments} from '../src/lib/geometry.js';
const grid = structuredClone(DEMO_REQUEST);
const circle = structuredClone(grid);
Object.assign(circle.geometry,{patternType:'circle',width:120,height:120,radius:50,gridRows:3,gridCols:2,gapX:80,gapY:90,startX:100,startY:150});
const linear = structuredClone(grid);
Object.assign(linear.geometry,{patternType:'linearPath',width:180,height:90,gridRows:3,gridCols:3,gapX:80,gapY:80,startX:80,startY:160});
const ordered = structuredClone(grid);
delete ordered.geometry;delete ordered.process;
ordered.geometries=[{geometry:{...circle.geometry,gridRows:1,gridCols:2,startX:100,startY:100},process:circle.process,sequence:0},{geometry:{...grid.geometry,gridRows:2,gridCols:2,startX:400,startY:150},process:grid.process,sequence:1}];
const examples=[['rectangle-grid',grid],['circles',circle],['linear-paths',linear],['ordered-geometry',ordered]];
await mkdir('examples',{recursive:true});await mkdir('docs/assets',{recursive:true});
const manifest=[];const panels=[];
for(const [id,request] of examples){
  const result=engine.generate(request);const validation=engine.validate(result.gcode,request.machineProfile);
  if(!validation.valid)throw new Error(`${id} failed static checks: ${JSON.stringify(validation.issues)}`);
  const preview=parsedSegments(engine.parse(result.gcode),request.machineProfile);
  const files={[`examples/${id}.json`]:JSON.stringify(request,null,2)+'\n',[`examples/${id}.nc`]:result.gcode};
  for(const [file,content] of Object.entries(files)){await writeFile(file,content);manifest.push({file,sha256:createHash('sha256').update(content).digest('hex')});}
  const paths=preview.segments.map(s=>`<path d="M${s.from[0]} ${1000-s.from[1]} L${s.to[0]} ${1000-s.to[1]}" stroke="${s.rapid?'#b4c1c7':'#187e77'}" stroke-width="${s.rapid?2:5}" ${s.rapid?'stroke-dasharray="8 7"':''}/>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="700" height="760" viewBox="0 0 1100 1190"><rect width="1100" height="1190" fill="#f4f6f4"/><text x="50" y="65" font-family="sans-serif" font-size="32" fill="#17302f">CGCG · ${id}</text><g transform="translate(50 100)"><rect width="1000" height="1000" fill="white" stroke="#c8d3d1"/>${paths}</g><text x="50" y="1150" font-family="sans-serif" font-size="20" fill="#526563">Synthetic XY draft · mm · no hardware qualification</text></svg>`;
  await writeFile(`docs/assets/${id}.svg`,svg);
  panels.push({id,lines:result.gcode.split('\n').length,segments:preview.segments.length,validation:'static-checks-pass',limitations:preview.limitations});
}
await writeFile('examples/manifest.json',JSON.stringify({synthetic:true,operatorReviewRequired:true,files:manifest,examples:panels},null,2)+'\n');
console.log(`Generated ${examples.length} synthetic examples; all static checks passed.`);
