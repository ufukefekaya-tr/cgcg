// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0
import { patternNames, colors } from '../lib/geometry.js';
import Icon from './Icon.jsx';
import { NumberField, SectionTitle, Switch } from './Fields.jsx';

export default function PatternPanel({entries, active, setActive, updateEntry, addEntry, removeEntry, moveEntry, profile}) {
  const entry = entries[active];
  if (!entry) return <section className="panel controls-panel"><div className="panel-heading"><h2>Pattern setup</h2></div><div className="empty-state">Loading the synthetic example…</div></section>;
  const geometry = entry.geometry; const process = entry.process;
  const geo = patch => updateEntry(active,{geometry:{...geometry,...patch}});
  const proc = patch => updateEntry(active,{process:{...process,...patch}});
  const circle = geometry.patternType === 'circle';
  return <section className="panel controls-panel">
    <div className="panel-heading"><div><span className="eyebrow">BUILD YOUR JOB</span><h2>Pattern setup</h2></div><button className="icon-button" title="Add another operation" aria-label="Add another operation" onClick={addEntry}><Icon name="plus" size={19}/></button></div>
    <div className="operations-list">{entries.map((item,index) => <div key={index} className={`operation-row ${active===index?'selected':''}`}>
      <button className="operation-select" onClick={() => setActive(index)}><span className="operation-number" style={{color:colors[index%colors.length],background:`${colors[index%colors.length]}12`}}>{String(index+1).padStart(2,'0')}</span><span>{patternNames[item.geometry.patternType]}<small>{item.geometry.gridRows || 1} × {item.geometry.gridCols || 1} repeat</small></span></button>
      <button className="icon-button operation-move" disabled={index===0} onClick={() => moveEntry(index,-1)} title="Move operation earlier" aria-label={`Move operation ${index+1} earlier`}>↑</button>
      {entries.length>1 && <button className="icon-button" onClick={() => removeEntry(index)} title="Remove operation" aria-label={`Remove operation ${index+1}`}><Icon name="trash" size={14}/></button>}
    </div>)}</div>
    <div className="form-body">
      <SectionTitle>Geometry <span className="section-number">01</span></SectionTitle>
      <label className="field"><span>Pattern type</span><select value={geometry.patternType} onChange={event => {
        const type=event.target.value;
        const patch={patternType:type};
        if(type==='circle'){patch.radius=geometry.width/2;patch.height=geometry.width;}
        geo(patch);
      }}>{Object.entries(patternNames).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="field-grid">{circle ? <><NumberField label="Diameter" value={(geometry.radius ?? geometry.width/2)*2} onChange={value => geo({radius:value/2,width:value,height:value})}/><NumberField label="Repeat X" value={geometry.gridRows} unit="" step="1" min="1" onChange={value => geo({gridRows:value})}/></> : <><NumberField label="Width · X" value={geometry.width} onChange={value => geo({width:value})}/><NumberField label="Height · Y" value={geometry.height} onChange={value => geo({height:value})}/></>}</div>
      <div className="field-grid">{circle ? <NumberField label="Repeat Y" value={geometry.gridCols} unit="" step="1" min="1" onChange={value => geo({gridCols:value})}/> : <><NumberField label="Repeat X" value={geometry.gridRows} unit="" step="1" min="1" onChange={value => geo({gridRows:value})}/><NumberField label="Repeat Y" value={geometry.gridCols} unit="" step="1" min="1" onChange={value => geo({gridCols:value})}/></>}</div>
      <div className="field-grid"><NumberField label="Gap · X" value={geometry.gapX} onChange={value => geo({gapX:value})}/><NumberField label="Gap · Y" value={geometry.gapY} onChange={value => geo({gapY:value})}/></div>
      <div className="field-grid"><NumberField label="Origin · X" value={geometry.startX} onChange={value => geo({startX:value})}/><NumberField label="Origin · Y" value={geometry.startY} onChange={value => geo({startY:value})}/></div>
      {geometry.patternType==='rectangleGrid' && <>
        <NumberField label="Corner radius" value={geometry.cornerRadius || 0} onChange={value => geo({cornerRadius:value})}/>
        <Switch label="Interior rectangle" checked={geometry.innerGeometry?.enabled} onChange={enabled => geo({innerGeometry:{width:geometry.width/2,height:geometry.height/2,cornerRadius:0,...geometry.innerGeometry,enabled}})}/>
        {geometry.innerGeometry?.enabled && <div className="field-grid"><NumberField label="Interior width" value={geometry.innerGeometry.width} onChange={width => geo({innerGeometry:{...geometry.innerGeometry,width}})}/><NumberField label="Interior height" value={geometry.innerGeometry.height} onChange={height => geo({innerGeometry:{...geometry.innerGeometry,height}})}/></div>}
      </>}
      <SectionTitle>Process <span className="section-number">02</span></SectionTitle>
      <NumberField label="Feed rate" value={process.feedRate} unit="mm/min" min="1" onChange={value => proc({feedRate:value})}/>
      <div className="field-grid"><NumberField label="Pre-dwell" value={process.preDwell || 0} unit="ms" onChange={value => proc({preDwell:value})}/><NumberField label="Post-dwell" value={process.postDwell || 0} unit="ms" onChange={value => proc({postDwell:value})}/></div>
      <Switch label="Dry-run draft" note="Omit dispensing activation" checked={process.dryRun} onChange={dryRun => proc({dryRun})}/>
      <Switch label="XY only" note="No Z-axis movement" checked={process.use2AxisOnly} onChange={use2AxisOnly => proc({use2AxisOnly})}/>
      <details className="advanced-settings"><summary>Additional process options</summary>
        <Switch label="Early close" checked={process.earlyCloseEnabled} onChange={earlyCloseEnabled => proc({earlyCloseEnabled})}/>
        {process.earlyCloseEnabled && <NumberField label="Early-close distance" value={process.earlyCloseDistance || 2} onChange={earlyCloseDistance => proc({earlyCloseDistance})}/>}
        <Switch label="Wash block" note="Requires verified profile mappings" checked={process.washEnabled} onChange={washEnabled => proc({washEnabled})}/>
        {process.washEnabled && <NumberField label="Wash duration" value={process.washDuration || 1000} unit="ms" onChange={washDuration => proc({washDuration})}/>}
        <Switch label="Priming block" checked={process.prePourPrimingEnabled} onChange={prePourPrimingEnabled => proc({prePourPrimingEnabled})}/>
        {process.prePourPrimingEnabled && <NumberField label="Priming duration" value={process.prePourPrimingDuration || 1000} unit="ms" onChange={prePourPrimingDuration => proc({prePourPrimingDuration})}/>}
      </details>
      <div className="profile-footnote"><Icon name="machine" size={16}/><span>{profile?.name || 'No profile selected'}<small>Review profile before machine use.</small></span></div>
    </div>
  </section>;
}
