'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function Navigation() { const path = usePathname(); return <nav aria-label="Main navigation">{[{href:'/',label:'Community rankings'},{href:'/submissions',label:'Everyone’s lists'},{href:'/rank',label:'Make your ranking'}].map(link => <Link key={link.href} href={link.href} aria-current={path === link.href ? 'page' : undefined}>{link.label}</Link>)}</nav>; }
