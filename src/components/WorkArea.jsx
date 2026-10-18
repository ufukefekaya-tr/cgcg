// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0
import { useMemo, useState } from 'react';
import { colors, geometryCells, parsedSegments } from '../lib/geometry.js';
import Icon from './Icon.jsx';

export default function WorkArea({entries, active, onSelect, profile, ast, parsedCurrent}) {
  const [mode, setMode] = useState('geometry');
  const width = profile?.table?.width || 1000;
  const height = profile?.table?.height || 1000;
  const cells = useMemo(() => geometryCells(entries), [entries]);
  const parsed = useMemo(() => parsedSegments(ast, profile), [ast, profile]);
  const k = Math.min(660/width, 365/height);
  const plotW = width*k; const plotH = height*k;
  const ox = (800-plotW)/2; const oy = 425;
  const grid = Math.max(width,height)/10;
  const px = x => ox+x*k; const py = y => oy-y*k;
  const total = entries.reduce((sum,entry) => sum+(entry.geometry.gridRows || 1)*(entry.geometry.gridCols || 1),0);
  return <section className="panel preview-panel">
    <div className="panel-heading">
      <div><span className="eyebrow">VISUAL WORKSPACE</span><h2>Working area <span className="unit-pill">XY / mm</span></h2></div>
      <div className="segmented" aria-label="Preview source">
        <button className={mode === 'geometry' ? 'active' : ''} onClick={() => setMode('geometry')}>Geometry</button>
        <button className={mode === 'code' ? 'active' : ''} disabled={!ast?.length || !parsedCurrent} onClick={() => setMode('code')}>Parsed code</button>
      </div>
    </div>
    <div className="drawing-surface">
      <div className="drawing-label"><span className="status-dot"/> {mode === 'geometry' ? 'PARAMETRIC PREVIEW' : 'PARSED XY PATH'}</div>
      <div className="drawing-view-label">TOP VIEW <Icon name="rectangle" size={14}/></div>
      <svg className="work-area" viewBox="0 0 800 485" role="img" aria-label={`${width} by ${height} millimetre working area with ${total} planned shapes`}>
        <defs>
          <pattern id="workspace-grid" width={grid*k} height={grid*k} patternUnits="userSpaceOnUse" x={ox} y={oy-plotH}>
            <path d={`M ${grid*k} 0 L 0 0 0 ${grid*k}`} fill="none" stroke="#dce5e4" strokeWidth="0.8"/>
          </pattern>
          <pattern id="workspace-dots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.65" fill="#cad4d3"/></pattern>
          <clipPath id="table-clip"><rect x={ox} y={oy-plotH} width={plotW} height={plotH}/></clipPath>
          <filter id="bed-shadow"><feDropShadow dx="0" dy="7" stdDeviation="10" floodColor="#203d3a" floodOpacity="0.06"/></filter>
        </defs>
        <rect width="800" height="485" fill="url(#workspace-dots)" opacity="0.5"/>
        <rect x={ox} y={oy-plotH} width={plotW} height={plotH} fill="white" stroke="#bacbc8" filter="url(#bed-shadow)"/>
        <rect x={ox} y={oy-plotH} width={plotW} height={plotH} fill="url(#workspace-grid)"/>
        {Array.from({length:6},(_,index) => <g key={index} className="ruler-label">
          <text x={px(width*index/5)} y={oy+23} textAnchor="middle">{Math.round(width*index/5)}</text>
          <text x={ox-15} y={py(height*index/5)+4} textAnchor="end">{Math.round(height*index/5)}</text>
          <path d={`M ${px(width*index/5)} ${oy} v 5 M ${ox-5} ${py(height*index/5)} h 5`} stroke="#adbfbc"/>
        </g>)}
        <g clipPath="url(#table-clip)">
          {mode === 'geometry' ? cells.map(cell => {
            const color = colors[cell.entry%colors.length];
            const selected = active === cell.entry;
            const common = {stroke:color, strokeWidth:selected ? 2.2 : 1.5, fill:selected ? `${color}10` : `${color}05`, vectorEffect:'non-scaling-stroke', onClick:() => onSelect(cell.entry), className:'preview-shape'};
            return <g key={cell.key}>
              {cell.patternType === 'circle' ? <circle cx={px(cell.x+(cell.radius ?? cell.width/2))} cy={py(cell.y+(cell.radius ?? cell.width/2))} r={(cell.radius ?? cell.width/2)*k} {...common}/> : cell.patternType === 'linearPath' ? <path d={`M ${px(cell.x)} ${py(cell.y)} L ${px(cell.x+cell.width)} ${py(cell.y+cell.height)}`} {...common} fill="none"/> : <rect x={px(cell.x)} y={py(cell.y+cell.height)} width={cell.width*k} height={cell.height*k} rx={(cell.cornerRadius || 0)*k} {...common}/>}
              {cell.innerGeometry?.enabled && <rect x={px(cell.x+(cell.width-cell.innerGeometry.width)/2)} y={py(cell.y+(cell.height+cell.innerGeometry.height)/2)} width={cell.innerGeometry.width*k} height={cell.innerGeometry.height*k} rx={(cell.innerGeometry.cornerRadius || 0)*k} stroke={color} strokeWidth="1.5" fill="none"/>}
              <circle cx={px(cell.patternType==='circle'?cell.x+2*(cell.radius ?? cell.width/2):cell.x+(cell.cornerRadius || 0))} cy={py(cell.patternType==='circle'?cell.y+(cell.radius ?? cell.width/2):cell.y)} r="3" fill={color}/>
            </g>;
          }) : (parsedCurrent ? parsed.segments : []).map((segment,index) => <path key={index} d={`M ${px(segment.from[0])} ${py(segment.from[1])} L ${px(segment.to[0])} ${py(segment.to[1])}`} stroke={segment.rapid ? '#9babb0' : '#167e77'} strokeWidth={segment.rapid ? 1 : 1.8} strokeDasharray={segment.rapid ? '4 4' : undefined} fill="none"/>)}
        </g>
        <path d={`M ${ox} ${oy} h 32 M ${ox} ${oy} v -32`} stroke="#d58548" strokeWidth="2"/>
        <path d={`M ${ox+32} ${oy} l -6 -3 v 6 Z M ${ox} ${oy-32} l -3 6 h 6 Z`} fill="#d58548"/>
        <text x={ox+39} y={oy+4} className="axis-label">X</text><text x={ox-4} y={oy-41} className="axis-label">Y</text>
        <text x="400" y="473" textAnchor="middle" className="ruler-label">{width} × {height} mm · {profile?.workCoordinate || 'G54'} work coordinates</text>
      </svg>
      {mode === 'code' && parsed.limitations.length > 0 && <div className="preview-note">{parsed.limitations.join(' ')}</div>}
      {mode === 'code' && !parsedCurrent && <div className="preview-note">Code changed. Parse it again to refresh this preview.</div>}
    </div>
    <div className="preview-footer"><div><span className="legend-line"/> {mode === 'geometry' ? 'Planned path' : 'Feed movement'}<span className="legend-dot"/> {mode === 'geometry' ? 'Path start' : 'Rapid moves are dashed'}</div><span>{total} shapes <span className="separator">/</span> {entries.length} operation{entries.length===1?'':'s'}</span></div>
  </section>;
}
