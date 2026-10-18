// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0
import { useState } from 'react';
import Icon from './Icon.jsx';
import { api } from '../lib/api.js';

export default function AssistantPanel({enabled,onBack}) {
  const [messages,setMessages]=useState([]);const [input,setInput]=useState('');
  const [image,setImage]=useState(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function send(event){
    event.preventDefault();if(!enabled || !input.trim() || busy)return;
    const next=[...messages.slice(-18),{role:'user',content:input.trim()}];
    if(next.reduce((sum,item) => sum+item.content.length,0)>16000){setError('This conversation is too long. Start a new chat before sending.');return;}
    setBusy(true);setError('');
    try{
      const result=await api('/vision/chat',{method:'POST',body:{messages:next,...(image?{image:{mimeType:image.mimeType,data:image.data}}:{})}});
      setMessages([...next,{role:'assistant',content:result.text || 'The provider returned no text.'}]);setInput('');setImage(null);
    }catch(cause){setError(cause.message);}finally{setBusy(false);}
  }
  async function attach(event){
    const file=event.target.files[0];event.target.value='';if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>500*1024){setError('Choose a PNG, JPEG or WebP image smaller than 500 KiB.');return;}
    const dataUrl=await new Promise((resolve,reject) => {const reader=new FileReader();reader.onload=() => resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
    setImage({mimeType:file.type,data:dataUrl.split(',')[1],url:dataUrl,name:file.name});setError('');
  }
  if(!enabled)return <section className="panel assistant-panel"><div className="assistant-icon"><Icon name="spark" size={38}/></div><span className="draft-badge">OPTIONAL · DISABLED BY DEFAULT</span><h2>A focused workspace.<br/>No AI account required.</h2><p>Pattern generation, parsing, injection and validation run locally. An operator can enable the optional provider on the server with their own credentials. Browser keys are never required.</p><div className="assistant-features"><span><Icon name="check" size={16}/>No automatic uploads</span><span><Icon name="check" size={16}/>AI currently disabled</span><span><Icon name="check" size={16}/>Local tools stay available</span></div><button className="button button-dark" onClick={onBack}>Back to the workbench<Icon name="arrow" size={16}/></button></section>;
  return <section className="panel chat-panel"><div className="panel-heading"><div><h2>Optional draft assistant</h2><p>Provider requests use your server configuration. Send only information you intend to share.</p></div><button className="text-button" onClick={() => {setMessages([]);setError('');}} disabled={busy}>New chat</button></div><div className="chat-messages">{!messages.length&&<div className="empty-state"><Icon name="spark" size={30}/><h3>Bring a question about your draft.</h3><p>Responses explain assumptions and do not approve code for hardware. No data is sent until you choose Send.</p></div>}{messages.map((message,index) => <article key={index} className={`chat-message ${message.role}`}><small>{message.role==='user'?'YOU':'ASSISTANT'}</small><p>{message.content}</p></article>)}</div>{error&&<div className="notification error" role="alert">{error}</div>}<form className="chat-form" onSubmit={send}><label className="field"><span>Your message</span><textarea aria-label="AI assistant message" maxLength={8000} placeholder="Ask about a command, pattern or draft assumption…" value={input} onChange={event => setInput(event.target.value)}/></label>{image&&<div className="image-attachment"><img src={image.url} alt="Selected attachment preview"/><span>{image.name}</span><button className="icon-button" type="button" aria-label="Remove attachment" onClick={() => setImage(null)}>×</button></div>}<div className="chat-actions"><label className="button button-light upload-label"><Icon name="upload" size={16}/>Attach image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={attach} disabled={busy}/></label><span>500 KiB max · no automatic context sharing</span><button className="button button-primary" type="submit" disabled={busy || !input.trim()}>{busy?'Waiting…':'Send'}<Icon name="arrow" size={16}/></button></div></form></section>;
}
