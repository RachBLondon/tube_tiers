import type { Metadata } from 'next';
import { RankingEditor } from '@/ui/ranking-editor';
import { submitRanking } from '@/app/actions';
import { databaseConfigured } from '@/db/client';
export const metadata:Metadata={title:'Make your ranking'};
export const dynamic='force-dynamic';
export default function Rank(){return <div className="page"><div className="eyebrow">YOUR COMMUTE. YOUR CALL.</div><section className="page-heading compact-heading"><div><h1>London transport tier list</h1><p>Click, hold and drag. You know where they belong.</p></div></section><RankingEditor connected={databaseConfigured()} submitAction={submitRanking}/></div>;}
