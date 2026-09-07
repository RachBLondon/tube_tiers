import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubmission } from '@/data/rankings';
import { TierBoard } from '@/ui/tier-board';
import { ShareRankingButton } from '@/ui/share-ranking';
export const dynamic='force-dynamic';
export const metadata={title:'Individual ranking'};
export default async function SubmissionPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const ranking=await getSubmission(id);if(!ranking)notFound();
 return <div className="page"><Link href="/submissions">← Everyone’s lists</Link><section className="page-heading compact-heading" style={{marginTop:24}}><div><h1>{ranking.username}’s ranking</h1><p>One Londoner’s verdict. Name unverified.</p></div><ShareRankingButton ranking={ranking}/></section><TierBoard rankings={ranking.rankings}/></div>;
}
