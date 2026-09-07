import { LINES, TIERS, parseRankings, type Rankings } from '../rankings';
export type ShareRanking = { id: string; username: string; rankings: Rankings };
const COLORS = ['#ff7f7f','#ffbf7f','#ffdf7f','#ffff7f','#bfff7f','#7fff7f','#7fffff'];
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char] ?? char));
export function buildRankingImage(ranking: ShareRanking): string {
  if (!parseRankings(ranking.rankings) || !ranking.username.trim() || ranking.username.length > 40) throw new Error('A complete saved ranking is required.');
  const groups = TIERS.map(tier => LINES.filter(line => ranking.rankings[line.id] === tier));
  const units = groups.map(lines => Math.max(1, Math.ceil(lines.length / 5)));
  const unitHeight = 906 / units.reduce((sum, n) => sum + n, 0);
  let y = 178;
  const rows = groups.map((lines,index) => {
    const height = (units[index] ?? 1) * unitHeight;
    const start = y; y += height;
    const logos = lines.map((line,i) => {
      const x = 154 + (i % 5) * 202 + 95;
      const cy = start + Math.floor(i / 5) * unitHeight + unitHeight / 2;
      const radius = Math.min(46, unitHeight * .40);
      const special = ['thameslink','uber-boat','heathrow-express'].includes(line.id);
      const blueBar = ['elizabeth','overground','dlr','trams','cable-car'].includes(line.id);
      const blueText = ['circle','hammersmith-city','waterloo-city'].includes(line.id);
      const labels = line.id === 'hammersmith-city' ? ['HAMMERSMITH','& CITY'] : line.id === 'heathrow-express' ? ['Heathrow','Express'] : [special ? line.name : line.name.toUpperCase()];
      const font = special ? 23 : line.name.length > 13 ? 15 : 17;
      const barHeight = labels.length > 1 ? 40 : 29;
      return `<g data-line="${line.id}">${special ? '' : `<circle cx="${x}" cy="${cy}" r="${radius-8}" fill="none" stroke="${line.color}" stroke-width="16"/><rect x="${x-92}" y="${cy-barHeight/2}" width="184" height="${barHeight}" fill="${blueBar?'#080f96':line.color}"/>`}${labels.map((label,j)=>`<text x="${x}" y="${cy+(j-(labels.length-1)/2)*(font+1)}" dominant-baseline="central" text-anchor="middle" fill="${blueText?'#06116f':line.id==='heathrow-express'?'#c7a3e0':'white'}" font-size="${font}" font-weight="700">${escape(label)}</text>`).join('')}</g>`;
    }).join('');
    return `<g data-tier="${TIERS[index]}"><rect x="32" y="${start}" width="1136" height="${height}" fill="#1c1c1c" stroke="#050505" stroke-width="6"/><rect x="32" y="${start}" width="105" height="${height}" fill="${COLORS[index]}" stroke="#050505" stroke-width="6"/><text x="84" y="${start+height/2}" text-anchor="middle" dominant-baseline="central" font-size="48" fill="black">${TIERS[index]}</text>${logos}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="#101010"/><g font-family="Arial, Helvetica, sans-serif"><text x="36" y="55" fill="#aaa" font-size="22" letter-spacing="3">TUBE TIERS · EVERYONE HAS AN OPINION</text><text x="36" y="106" fill="white" font-size="42" font-weight="700">London transport tier list</text><text x="36" y="149" fill="#ddd" font-size="28">${escape(ranking.username)}’s ranking</text>${rows}<text x="600" y="1131" text-anchor="middle" fill="#bbb" font-size="23">Disagree? Rank yours.</text><text x="600" y="1171" text-anchor="middle" fill="white" font-size="29" font-weight="700">tube-tiers.vercel.app</text></g></svg>`;
}
