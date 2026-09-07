'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
type Turnstile={render:(container:HTMLElement,options:{sitekey:string;callback:(token:string)=>void;'expired-callback':()=>void;'error-callback':()=>void})=>string;remove:(id:string)=>void};
export function Captcha({onToken}:{onToken:(token:string)=>void}){
 const ref=useRef<HTMLDivElement>(null);
 const [ready,setReady]=useState(false);
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
 useEffect(()=>{
   const turnstile=(window as Window & {turnstile?:Turnstile}).turnstile;
   if(!ready||!siteKey||!ref.current||!turnstile)return;
   const id=turnstile.render(ref.current,{sitekey:siteKey,callback:onToken,'expired-callback':()=>onToken(''),'error-callback':()=>onToken('')});
   return()=>turnstile.remove(id);
 },[ready,siteKey,onToken]);
 if(!siteKey)return null;
 return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={()=>setReady(true)}/><div ref={ref} style={{marginTop:16}}/></>;
}
