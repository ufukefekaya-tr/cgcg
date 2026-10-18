// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0
import { useState } from 'react';
import Icon from './Icon.jsx';
import { NumberField } from './Fields.jsx';

const rules = [
  ['changeFeedrate','Change feed rate','feedRate','mm/min'],
  ['addPreDwell','Add pre-dwell','durationMs','ms'],
  ['addPostDwell','Add post-dwell','durationMs','ms'],
  ['addWashBlock','Add wash block','durationMs','ms'],
  ['addPrimingBlock','Add priming block','durationMs','ms'],
  ['insertSafeZ','Insert safe Z',null,null],
  ['addEarlyClose','Add early close','distanceMm','mm'],
  ['changeMCode','Replace an M-code',null,null],
];
export default function CodePanel({filename,gcode,setGcode,onParse,onValidate,onInject,onDownload,onSave,busy,metadata,validation,parseStats,stale,notice}) {
  const [tab,setTab]=useState('editor');
  const [rule,setRule]=useState('changeFeedrate'); const [value,setValue]=useState(900);
  const [oldCode,setOldCode]=useState('M04'); const [newCode,setNewCode]=useState('M03');
  const ruleDetails=rules.find(item => item[0]===rule);
  const lines=gcode.split('\n').length;
  return <section className="panel code-panel">
    <div className="panel-heading code-heading"><div className="code-tabs"><button className={tab==='editor'?'active':''} onClick={() => setTab('editor')}><Icon name="code" size={17}/>G-code editor</button><button className={tab==='injection'?'active':''} onClick={() => setTab('injection')}>Inject rules</button><button className={tab==='checks'?'active':''} onClick={() => setTab('checks')}>Checks{validation?.issues?.length>0 && <span className="small-count">{validation.issues.length}</span>}</button></div><span className="draft-badge">DRAFT</span></div>
    {tab==='editor' && <>
      <div className="code-toolbar"><span><i className="file-dot"/> {filename} <span className="subtle">· {lines} lines</span></span><div><button className="text-button" onClick={onParse} disabled={!gcode || busy}>Parse</button><button className="text-button" onClick={() => {onValidate();setTab('checks');}} disabled={!gcode || busy}><Icon name="check" size={14}/>Validate</button><button className="icon-button" title="Save draft to local files" aria-label="Save draft to local files" onClick={onSave} disabled={!gcode || busy}><Icon name="file" size={16}/></button><button className="icon-button" title="Download G-code draft" aria-label="Download G-code draft" onClick={onDownload} disabled={!gcode}><Icon name="download" size={16}/></button></div></div>
      {stale && <div className="inline-note">Pattern or profile changed. Generate a new draft to match the geometry preview.</div>}
      <div className="editor-wrap"><div className="line-numbers" aria-hidden="true">{Array.from({length:lines},(_,index) => <div key={index}>{index+1}</div>)}</div><textarea className="gcode-editor" aria-label="G-code draft editor" onScroll={event => {event.target.previousElementSibling.scrollTop=event.target.scrollTop;}} spellCheck="false" value={gcode} onChange={event => setGcode(event.target.value)} placeholder="Generate a draft to inspect and edit its G-code here."/></div>
    </>}
    {tab==='injection' && <div className="injection-body"><div><h3>Make an explicit code change</h3><p>Rules edit the current draft. Validate and review the result after every change.</p></div><div className="injection-fields"><label className="field"><span>Injection rule</span><select value={rule} onChange={event => setRule(event.target.value)}>{rules.map(item => <option value={item[0]} key={item[0]}>{item[1]}</option>)}</select></label>{ruleDetails[2] && <NumberField label="Value" value={value} unit={ruleDetails[3]} onChange={setValue}/>} {rule==='changeMCode' && <><label className="field"><span>Existing code</span><input value={oldCode} onChange={event => setOldCode(event.target.value)}/></label><label className="field"><span>Replacement</span><input value={newCode} onChange={event => setNewCode(event.target.value)}/></label></>}</div><button className="button button-dark" disabled={!gcode || busy} onClick={() => onInject({type:rule,params:rule==='changeMCode'?{oldMCode:oldCode,newMCode:newCode}:ruleDetails[2]?{[ruleDetails[2]]:value}:{}})}><Icon name="plus" size={16}/>Apply to draft</button></div>}
    {tab==='checks' && <div className="checks-body"><div className="checks-heading"><div><h3>{validation ? validation.valid ? 'No blocking issues in the configured checks' : 'Draft needs attention' : 'Review the current draft'}</h3><p>Checks cover configured syntax, limits and process rules. Operator and controller verification is still required.</p></div><button className="button button-light" disabled={!gcode || busy} onClick={onValidate}><Icon name="check" size={16}/>Run checks</button></div>{validation?.issues?.map((issue,index) => <div className={`issue-row ${issue.severity}`} key={index}><span>{issue.severity || 'note'}</span><div><strong>{issue.message || issue.code}</strong><small>{issue.code}{issue.lineNumber || issue.line ? ` · line ${issue.lineNumber || issue.line}` : ''}</small></div></div>)}{validation && !validation.issues?.length && <div className="check-clear"><Icon name="check"/>Configured checks completed. This draft has not been approved for a physical machine.</div>}</div>}
    <div className="code-footer"><span><span className="status-dot muted"/>{notice || 'Editable draft · operator review required'}</span><span>{parseStats ? `${parseStats.motionCount} motions` : metadata?.totalLines ? `${metadata.totalLines} generated lines` : 'UTF-8'}<span className="separator">/</span>mm</span></div>
  </section>;
}
