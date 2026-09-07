'use server';
import { revalidatePath } from 'next/cache';
import { validateSubmission } from '@/core/rankings';
import { saveRanking } from '@/data/rankings';
export async function submitRanking(input:unknown) {
  if(!input || typeof input!=='object' || !('username' in input) || !('rankings' in input))return {error:'Add a name and rank all 19 services before submitting.'};
  const parsed=validateSubmission(input.username,input.rankings);
  if(!parsed)return {error:'Rank every service and use a name of 2–40 characters (letters, numbers, spaces or simple punctuation).'};
  const captchaToken='captchaToken' in input && typeof input.captchaToken==='string' && input.captchaToken.length<=4096 ? input.captchaToken : undefined;
  const result=await saveRanking(parsed.username,parsed.rankings,captchaToken);
  if(result.id){revalidatePath('/submissions');}
  return result;
}
