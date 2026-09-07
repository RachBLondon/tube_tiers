import type { Metadata } from 'next';
import Link from 'next/link';
import { getSubmissions, PAGE_SIZE } from '@/data/rankings';
import { TierBoard } from '@/ui/tier-board';
import { LineChip } from '@/ui/line-chip';
import { LINES } from '@/core/rankings';
export const metadata: Metadata = {title:'Everyone’s lists'};
export const dynamic='force-dynamic';
export default async function Submissions({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const params=await searchParams;
  const parsed=Number(params.page ?? 1);
  const page=Number.isSafeInteger(parsed) && parsed>0 && parsed<=100000 ? parsed : 1;
  const {submissions,total,error}=await getSubmissions(page);
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  return <div className="page"><div className="eyebrow">THE PEOPLE HAVE OPINIONS</div><section className="page-heading compact-heading"><div><h1>Everyone’s lists<span>.</span></h1><p>Same city. Very different journeys.<br/>Open a name to see their full ranking.</p></div><Link className="button primary" href="/rank">Add your opinion <span>↗</span></Link></section><div className="section-heading"><h2>All submissions <span className="count">{error?'Unavailable':total}</span></h2><span className="small-note">Newest first · Names are unverified</span></div>{error?<div className="notice error" role="alert">{error}</div>:submissions.length?<div className="list-grid">{submissions.map(submission=>{const favourite=LINES.find(line=>submission.rankings[line.id]==='A*');return <details className="submission" key={submission.id}><summary><span className="avatar" aria-hidden="true">{submission.username.slice(0,2).toUpperCase()}</span><span className="submission-name"><strong>{submission.username}</strong><small>{new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Europe/London'}).format(new Date(submission.created_at))} · #{submission.id.slice(0,8)}</small></span><span className="submission-peek">{favourite && <>Top tier <LineChip line={favourite}/></>}</span><span className="expand-icon" aria-hidden="true">+</span></summary><div className="submission-board"><TierBoard rankings={submission.rankings}/></div></details>;})}</div>:<div className="empty-state"><h2>{page>1?'No lists on this page':'The debate starts with you.'}</h2><p>{page>1?'Head back to the first page to see the submissions.':'No submissions yet. Give London’s transport its first verdict.'}</p><Link className="button primary" href={page>1?'/submissions':'/rank'}>{page>1?'Back to all lists':'Make the first ranking'} ↗</Link></div>}{!error && (pages>1 || page>1) && <nav className="pagination" aria-label="Submission pages">{page>1 && <Link href={`/submissions?page=${page-1}`} className="button">← Previous</Link>}<span>Page {page} of {pages}</span>{page<pages && <Link href={`/submissions?page=${page+1}`} className="button">Next →</Link>}</nav>}</div>;
}
