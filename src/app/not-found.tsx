import Link from 'next/link';
export default function NotFound(){return <div className="page empty-state"><h1>End of the line.</h1><p>That page doesn’t exist.</p><Link className="button primary" href="/">Back to the rankings</Link></div>;}
