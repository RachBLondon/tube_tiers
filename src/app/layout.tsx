import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/ui/navigation';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Tube Tiers — London, ranked.', template: '%s · Tube Tiers' }, description: 'Rank London’s transport from A* to F. See the community verdict and compare everyone’s tier lists.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><body><header className="site-header"><div className="header-inner"><Link className="brand" href="/" aria-label="Tube Tiers home"><span className="brand-symbol" aria-hidden="true"><i /></span>tube<span className="brand-light">tiers</span><span className="brand-period">.</span></Link><Navigation /><span className="location"><span className="live-dot" /> LONDON, UK</span></div></header><main>{children}</main><footer><span>Made for the daily debate.</span><span>An unofficial London transport tier list.</span><span>Mind the opinions.</span></footer></body></html>;
}
