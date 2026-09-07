'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { LINES, TIERS, isTier, type Rankings, type Tier } from '@/core/rankings';
import { LineChip } from './line-chip';
import { Captcha } from './captcha';
type Props={connected:boolean;submitAction:(input:unknown)=>Promise<{id?:string;error?:string}>};
const DRAFT_KEY='tube-tiers:draft:v1';
export function RankingEditor({connected,submitAction}:Props){
  const [rankings,setRankings]=useState<Rankings>({});
  const [username,setUsername]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const [over,setOver]=useState<string|null>(null);
  const [ready,setReady]=useState(false);
  const [storageAvailable,setStorageAvailable]=useState(true);
  const [error,setError]=useState('');
  const [announcement,setAnnouncement]=useState('');
  const [saved,setSaved]=useState('');
  const [captchaToken,setCaptchaToken]=useState('');
  const [captchaKey,setCaptchaKey]=useState(0);
  const [pending,startTransition]=useTransition();
  const touch=useRef<{id:string;startX:number;startY:number;x:number;y:number;dragging:boolean}|null>(null);
  const [drag,setDrag]=useState<{id:string;x:number;y:number}|null>(null);
  const dragging=drag!==null;
  const form=useRef<HTMLFormElement>(null);
  const count=Object.keys(rankings).length;
  const signature=JSON.stringify({username:username.trim(),rankings});
  useEffect(()=>{
    let live=true;
    queueMicrotask(()=>{
      if(!live)return;
      try {
        const raw=localStorage.getItem(DRAFT_KEY);
        if(raw){const draft:unknown=JSON.parse(raw);if(draft && typeof draft==='object'){
          if('username' in draft && typeof draft.username==='string')setUsername(draft.username.slice(0,40));
          if('rankings' in draft && draft.rankings && typeof draft.rankings==='object' && !Array.isArray(draft.rankings))setRankings(Object.fromEntries(Object.entries(draft.rankings).filter(([id,tier])=>LINES.some(line=>line.id===id)&&isTier(tier))));
        }}
      }catch{setStorageAvailable(false);}
      setReady(true);
    });return()=>{live=false;};
  },[]);
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(DRAFT_KEY,JSON.stringify({username,rankings}));}catch{queueMicrotask(()=>setStorageAvailable(false));}},[ready,username,rankings]);
  function move(id:string,tier:Tier|'unranked'){
    if(pending || !LINES.some(line=>line.id===id))return;
    setRankings(previous=>{const next={...previous};if(tier==='unranked')delete next[id];else next[id]=tier;return next;});
    setSelected(null);setOver(null);setError('');
    setAnnouncement(`${LINES.find(line=>line.id===id)?.name} moved to ${tier==='unranked'?'unranked':`${tier} tier`}.`);
  }
  useEffect(()=>{
    if(!dragging)return;
    let frame=0;
    function tick(){
      const pointer=touch.current;
      if(!pointer?.dragging)return;
      const edge=80;
      const scroll=pointer.y<edge ? -Math.ceil((edge-pointer.y)/5) : pointer.y>window.innerHeight-edge ? Math.ceil((pointer.y-window.innerHeight+edge)/5) : 0;
      if(scroll)window.scrollBy(0,scroll);
      const target=document.elementFromPoint(pointer.x,pointer.y)?.closest<HTMLElement>('[data-tier-drop]');
      setOver(target?.dataset.tierDrop ?? null);
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[dragging]);
  function cancelDrag(){touch.current=null;setDrag(null);setOver(null);setSelected(null);}
  function chip(line:(typeof LINES)[number]) {return <button type="button" key={line.id} disabled={pending || !ready} className={`draggable${selected===line.id?' selected':''}`} aria-label={`${line.name}, ${rankings[line.id] ? `${rankings[line.id]} tier` : 'unranked'}`} aria-describedby="drag-instructions"
    onPointerDown={event=>{
      if(event.button!==0||pending||!ready)return;
      event.preventDefault();event.currentTarget.focus();
      touch.current={id:line.id,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,dragging:false};
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event=>{
      const current=touch.current;if(!current)return;
      current.x=event.clientX;current.y=event.clientY;
      if(Math.hypot(current.x-current.startX,current.y-current.startY)>4)current.dragging=true;
      if(current.dragging){setSelected(current.id);setDrag({id:current.id,x:current.x,y:current.y});}
    }}
    onPointerUp={event=>{
      const current=touch.current;
      if(current?.dragging){
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-tier-drop]')?.dataset.tierDrop;
        if(target==='unranked'||isTier(target))move(current.id,target);
      }
      cancelDrag();
    }}
    onPointerCancel={cancelDrag}
    onLostPointerCapture={cancelDrag}
    onKeyDown={event=>{
      if(event.key==='Escape'){cancelDrag();return;}
      if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();move(line.id,'unranked');return;}
      if(event.key==='ArrowUp'||event.key==='ArrowDown'){
        event.preventDefault();
        const current=rankings[line.id];
        const index=current ? TIERS.indexOf(current)+(event.key==='ArrowUp'?-1:1) : 0;
        move(line.id,TIERS[Math.max(0,Math.min(TIERS.length-1,index))] ?? 'A*');
        requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-line-id="${line.id}"]`)?.focus());
      }
    }} data-line-id={line.id}
    ><LineChip line={line}/></button>;}
  function submit(){
    if(pending)return;
    setError('');
    startTransition(async()=>{
      try{const result=await submitAction({username,rankings,captchaToken});if(result.error)setError(result.error);else if(result.id){setSaved(signature);setAnnouncement('Your ranking has been submitted. Thank you!');}}
      catch{setError('Something interrupted your submission. Please try again.');}
      finally{setCaptchaToken('');setCaptchaKey(value=>value+1);}
    });
  }
  useEffect(()=>{
    const context=(document as Document & {modelContext?:{registerTool:(tool:{name:string;description:string;inputSchema:object;execute:(input:unknown)=>unknown;annotations:{readOnlyHint:boolean}},options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context)return;
    const lifecycle=new AbortController();
    try{void Promise.resolve(context.registerTool({name:'stage_tube_ranking',description:'Set all 19 service tiers and a name in the visible draft. Does not submit a vote. Review and use the Submit ranking button to publish.',inputSchema:{type:'object',properties:{username:{type:'string',minLength:2,maxLength:40},rankings:{type:'object',properties:Object.fromEntries(LINES.map(line=>[line.id,{type:'string',enum:TIERS}])),required:LINES.map(line=>line.id),additionalProperties:false}},required:['username','rankings'],additionalProperties:false},annotations:{readOnlyHint:false},async execute(input:unknown){const {validateSubmission}=await import('@/core/rankings');const valid=input && typeof input==='object' && 'username' in input && 'rankings' in input ? validateSubmission(input.username,input.rankings) : null;if(!valid)throw new Error('A valid name and all 19 tiers are required.');if(!ready || pending)throw new Error('Please wait until the editor is ready.');setRankings(valid.rankings);setUsername(valid.username);setSelected(null);await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));return {status:'draft',lines:19,submitted:false};}},{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser capability; the regular editor remains available. */}
    return()=>lifecycle.abort();
  },[ready,pending]);
  return <><div className="editor-toolbar"><span className="small-note">{ready?`${count} of ${LINES.length} services ranked`:'Loading your draft…'} · {storageAvailable?'Draft saved on this device':'Draft lasts while this page stays open'}</span><button type="button" className="text-button" disabled={pending||!count} onClick={()=>{if(window.confirm('Clear the tiers in your draft? This does not delete your submitted ranking.')){setRankings({});setSelected(null);setError('');}}}>Reset draft</button></div>
    {!connected && <div className="notice">The board is ready to try. Submitting opens when the database is connected.</div>}
    <p className="sr-only" id="drag-instructions">Drag a service straight into a tier. With a keyboard, focus a service and use the up and down arrow keys to change its tier. Press Delete to return it to unranked.</p>
    <div className="editor-layout"><div className="tier-board editor">{TIERS.map((tier,index)=><div className={`tier-row${over===tier?' dropping':''}`} key={tier} data-tier-drop={tier}><div className={`tier-label tier-${index}`}><strong>{tier}</strong></div><div className="tier-content">{LINES.filter(line=>rankings[line.id]===tier).map(chip)}</div></div>)}</div><aside className={`pool${over==='unranked'?' dropping':''}`} data-tier-drop="unranked"><h3>Drag these into your tier list <span className="count">{LINES.length-count} left</span></h3><div className="pool-lines">{LINES.filter(line=>!rankings[line.id]).map(chip)}</div>{count===LINES.length&&<p>All ranked. Add your name and submit below.</p>}</aside></div>
    {drag && createPortal(<div className="drag-preview" style={{left:drag.x,top:drag.y}} aria-hidden="true">{LINES.filter(line=>line.id===drag.id).map(line=><LineChip key={line.id} line={line}/>)}</div>,document.body)}
    <form ref={form} onSubmit={event=>{event.preventDefault();submit();}}><div className="submit-panel"><div className="field"><label htmlFor="username">Put a name to your opinions</label><input id="username" name="username" value={username} onChange={event=>setUsername(event.target.value)} placeholder="Your name or nickname" minLength={2} maxLength={40} required autoComplete="nickname" disabled={pending||!ready} aria-describedby="privacy-note"/></div><button className="button primary" disabled={pending||!ready||!connected||count!==LINES.length||username.trim().length<2||saved===signature} type="submit">{pending?'Submitting…':saved===signature?'Ranking submitted ✓':saved?'Update ranking ↗':'Submit ranking ↗'}</button></div><Captcha key={captchaKey} onToken={setCaptchaToken}/><p className="privacy-note" id="privacy-note">Your name and ranking will be public. Names aren’t verified. This browser remembers your vote; submitting again updates it. Clearing cookies or using another browser allows another vote.</p></form>
    {count<LINES.length && <p className="privacy-note">Rank the remaining {LINES.length-count} {LINES.length-count===1?'service':'services'} to submit.</p>}
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    {error&&<div className="notice error" role="alert" style={{marginTop:20}}>{error}</div>}
    {saved===signature && <div className="notice" style={{marginTop:20}}>Your opinion is on the board. <Link href="/" style={{textDecoration:'underline'}}>See the community verdict →</Link> or <Link href="/submissions" style={{textDecoration:'underline'}}>browse everyone’s lists</Link>.</div>}
  </>;
}
