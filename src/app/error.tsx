'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="page empty-state"><h1>A short delay.</h1><p>We couldn’t load this page. Please try again.</p><button className="button primary" onClick={reset}>Try again</button></div>;}
