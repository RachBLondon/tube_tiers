import { describe, it, expect } from 'vitest';
import { buildRankingImage } from '../src/core/share-image';
import { LINES, TIERS } from '../src/core/rankings';
describe('share image export',()=>{
 it.each(TIERS)('includes every line exactly once when all services are in %s',tier=>{
  const svg=buildRankingImage({id:'test',username:'Local preview',rankings:Object.fromEntries(LINES.map(line=>[line.id,tier]))});
  expect(svg).toContain('width="1200" height="1200"');
  expect(svg.match(/data-line=/g)).toHaveLength(19);
  expect(svg.match(/data-tier=/g)).toHaveLength(7);
  for(const line of LINES)expect(svg.match(new RegExp(`data-line="${line.id}"`,'g'))).toHaveLength(1);
  const circles=[...svg.matchAll(/cy="([0-9.]+)" r="([0-9.]+)"/g)];
  for(const circle of circles){expect(Number(circle[1])-Number(circle[2])-8).toBeGreaterThanOrEqual(178);expect(Number(circle[1])+Number(circle[2])+8).toBeLessThanOrEqual(1084);}
 });
 it('escapes supplied names rather than interpreting them as SVG',()=>{
  const svg=buildRankingImage({id:'test',username:'<script>&"',rankings:Object.fromEntries(LINES.map(line=>[line.id,'C']))});
  expect(svg).toContain('&lt;script&gt;&amp;&quot;');expect(svg).not.toContain('<script>');
 });
 it('rejects incomplete drafts',()=>{expect(()=>buildRankingImage({id:'test',username:'Rachel',rankings:{}})).toThrow();});
});
