import 'server-only';
import { unstable_cache } from 'next/cache';
import { databaseConfigured, publicDatabase, actionDatabase } from '@/db/client';
import { parseRankings, type Submission, type Average, type Rankings } from '@/core/rankings';
// Keep the existing rendering mode: use-cache requires a broader Cache Components migration.
// Only this public aggregate is cached; cookie-backed clients and capacity checks stay uncached.
const cachedCommunity = unstable_cache(async (projectUrl: string) => {
  if(projectUrl !== process.env.NEXT_PUBLIC_SUPABASE_URL)throw new Error('Database configuration changed');
  const {data,error}=await publicDatabase().rpc('community_averages');
  if(error || !data)throw new Error('Community read failed');
  // Every valid submission includes all services. Use the same query snapshot for count and averages.
  return {averages:data,total:Number(data[0]?.votes ?? 0)};
}, ['community-verdict-v1'], {revalidate:60});
export async function getCommunity(): Promise<{averages:Average[];total:number;error?:string}> {
  if (!databaseConfigured()) return {averages:[],total:0,error:'This board is ready for its database. Submissions will open once it’s connected.'};
  try {
    return await cachedCommunity(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  } catch { return {averages:[],total:0,error:'We couldn’t load the community rankings. Please refresh in a moment.'}; }
}
export const PAGE_SIZE=20;
export async function getSubmissions(page:number): Promise<{submissions:Submission[];total:number;error?:string}> {
  if(!databaseConfigured())return {submissions:[],total:0,error:'Submissions will appear here once the database is connected.'};
  try {
    const {data,error,count}=await publicDatabase().from('submissions').select('id,username,rankings,created_at',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1);
    if(error)throw error;
    const submissions=(data ?? []).map(row=>{const rankings=parseRankings(row.rankings);if(!rankings)throw new Error('Invalid saved ranking');return {...row,rankings};});
    return {submissions,total:count ?? 0};
  }catch{return {submissions:[],total:0,error:'We couldn’t load the submissions. Please try again in a moment.'};}
}
const CAPACITY_MESSAGE='This tier list has reached its limit of 10,000 submissions. Existing voters can still update their ranking.';
export async function saveRanking(username:string, rankings:Rankings, captchaToken?:string): Promise<{id?:string;error?:string}> {
  if(!databaseConfigured())return {error:'The database isn’t connected yet. Your draft is still on this device.'};
  try {
    const db=await actionDatabase();
    let {data:{user}}=await db.auth.getUser();
    if(!user){
      // Avoid creating another anonymous account through this app when full.
      // The database function remains authoritative for concurrent requests.
      const capacity=await publicDatabase().from('submissions').select('id',{count:'exact',head:true});
      if(capacity.error || capacity.count===null)return {error:'We couldn’t check whether submissions are open. Please try again shortly.'};
      if(capacity.count>=10000)return {error:CAPACITY_MESSAGE};
      const result=await db.auth.signInAnonymously({options:{captchaToken}});
      if(result.error || !result.data.user) return {error:'We couldn’t create your anonymous session. Try again shortly, or complete the verification if shown.'};
      user=result.data.user;
    }
    const {data,error}=await db.rpc('submit_ranking',{p_username:username,p_rankings:rankings});
    if(error){
      if(error.code==='PT429')return {error:CAPACITY_MESSAGE};
      if(error.code==='P0001')return {error:'Please wait 30 seconds before updating your ranking again.'};
      return {error:'Your ranking couldn’t be saved. Please try again. Your draft is still here.'};
    }
    if(!data)return {error:'We couldn’t confirm your submission. Please try again.'};
    return {id:data};
  }catch{return {error:'We couldn’t reach the database. Your draft is still here; please try again.'};}
}

export async function getSubmission(id:string): Promise<Submission|null> {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return null;
  const {data,error}=await publicDatabase().from('submissions').select('id,username,rankings,created_at').eq('id',id).maybeSingle();
  if(error)throw new Error('We couldn’t load this ranking. Please try again.');
  if(!data)return null;
  const rankings=parseRankings(data.rankings);if(!rankings)throw new Error('This ranking could not be read.');
  return {...data,rankings};
}
