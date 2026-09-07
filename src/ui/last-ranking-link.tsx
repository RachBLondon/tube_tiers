'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export const LAST_RANKING_KEY='tube-tiers:last-submission:v1';
export function LastRankingLink(){
 const [id,setId]=useState<string|null>(null);
 useEffect(()=>{let active=true;queueMicrotask(()=>{try{const stored=localStorage.getItem(LAST_RANKING_KEY);if(active && stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored))setId(stored);}catch{/* Remembering a public link is optional. */}});return()=>{active=false;};},[]);
 return id?<div className="last-ranking"><Link href={`/submissions/${id}`}>Your last ranking — view or share →</Link></div>:null;
}
