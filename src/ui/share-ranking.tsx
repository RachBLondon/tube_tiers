'use client';
import { useEffect, useRef, useState } from 'react';
import { buildRankingImage, type ShareRanking } from '@/core/share-image';
async function makePng(ranking: ShareRanking): Promise<Blob> {
  const svg = new Blob([buildRankingImage(ranking)], {type:'image/svg+xml;charset=utf-8'});
  const source = URL.createObjectURL(svg);
  try {
    const image = new Image();
    await new Promise<void>((resolve,reject) => { image.onload=()=>resolve(); image.onerror=()=>reject(new Error('Image generation failed')); image.src=source; });
    const canvas = document.createElement('canvas'); canvas.width=1200; canvas.height=1200;
    const context=canvas.getContext('2d'); if(!context)throw new Error('Image generation is unavailable');
    context.drawImage(image,0,0);
    const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image generation failed')),'image/png'));
    if(png.size>5_000_000)throw new Error('The image is too large to share.');
    return png;
  } finally { URL.revokeObjectURL(source); }
}
export function ShareRankingButton({ranking}: {ranking: ShareRanking}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const active=useRef(0);
  const imageUrl=useRef<string|null>(null);
  const [preview,setPreview]=useState<string|null>(null);
  const [file,setFile]=useState<File|null>(null);
  const [error,setError]=useState('');
  const [sharing,setSharing]=useState(false);
  const [canShare,setCanShare]=useState(false);
  const [retry,setRetry]=useState(false);
  const [postUrl,setPostUrl]=useState('');
  useEffect(()=>()=>{active.current++;if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);},[]);
  function close(){active.current++;dialog.current?.close();if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);imageUrl.current=null;setPreview(null);setFile(null);setError('');setSharing(false);}
  async function open(){
    const request=++active.current;
    const params=new URLSearchParams({text:'My London transport tier list 🚇 You know these lines are the best. Who’s with me? #TubeTiers',url:new URL(`/submissions/${ranking.id}`,window.location.origin).href});
    setPostUrl(`https://twitter.com/intent/tweet?${params.toString()}`);
    setError('');setRetry(false);setPreview(null);setFile(null);
    if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);imageUrl.current=null;
    if(!dialog.current?.open)dialog.current?.showModal();
    try {
      const blob=await makePng(ranking);
      if(request!==active.current)return;
      const name=ranking.username.replace(/[^a-z0-9_-]/gi,'-').slice(0,40)||'my';
      const generated=new File([blob],`${name}-tube-tiers.png`,{type:'image/png'});
      const url=URL.createObjectURL(blob);imageUrl.current=url;setPreview(url);setFile(generated);
      setCanShare(typeof navigator.canShare==='function' && navigator.canShare({files:[generated]}));
    }catch{if(request===active.current){setError('We couldn’t create your image. Your ranking is safe. Please try again.');setRetry(true);}}
  }
  async function share(){
    if(!file || sharing)return;
    setSharing(true);setError('');
    try {await navigator.share({files:[file]});}
    catch(error){if(!(error instanceof Error && error.name==='AbortError'))setError('Sharing isn’t available here. Use Download image instead.');}
    finally{setSharing(false);}
  }
  return <><button type="button" className="button" onClick={()=>void open()}>Share ranking ↗</button><dialog ref={dialog} className="share-dialog" aria-label={`Share ${ranking.username}’s ranking`} onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}><div className="share-dialog-inner"><div className="share-heading"><h2>Share your opinions</h2><button type="button" className="button" aria-label="Close image preview" onClick={close}>×</button></div><p>A square image, ready for your next transport debate.</p>{preview ? <>
    {/* A local blob URL generated on this device; no image optimization or remote fetch is needed. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="share-preview" src={preview} width={1200} height={1200} alt={`${ranking.username}’s complete London transport tier list. Tiers A* to F with all 19 services.`}/>
    <div className="share-options">
      {canShare&&<div className="share-direct"><button type="button" className="button primary" disabled={sharing} onClick={()=>void share()}>{sharing?'Sharing…':'Share image ↗'}</button><p>Choose X or another app from your device’s share menu.</p></div>}
      <div className="share-alternatives">
        <div><a className={`button${canShare?'':' primary'}`} href={postUrl} target="_blank" rel="noopener noreferrer">Post on X ↗</a><p>Opens a draft with text and your ranking link. Add the image yourself if you like.</p></div>
        <div><a className="button" href={preview} download={file?.name}>Download image ↓</a><p>Save the full tier list to attach to any post.</p></div>
      </div>
    </div><p className="privacy-note share-image-size">1200 × 1200 PNG · Made for a good argument.</p></> : !error && <p className="share-loading" role="status">Creating your image…</p>}{error&&<p className="notice error" role="alert">{error}</p>}{retry&&<button type="button" className="button" onClick={()=>void open()}>Try again</button>}</div></dialog></>;
}
