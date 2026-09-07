import {describe,it,expect} from 'vitest';
import {LINES,TIERS,parseRankings,validateSubmission,scoreToTier} from '../src/core/rankings';
const complete=Object.fromEntries(LINES.map(line=>[line.id,'B']));
describe('ranking submission boundary',()=>{
 it('includes precisely 19 services including Metropolitan',()=>{expect(LINES).toHaveLength(19);expect(new Set(LINES.map(line=>line.id)).size).toBe(19);});
 it('requires a Metropolitan choice for new votes',()=>{const {metropolitan,...legacy}=complete;expect(metropolitan).toBe('B');expect(parseRankings(legacy)).toBeNull();});
 it('accepts a complete ranking and trims the public name',()=>{expect(validateSubmission('  Rachel  ',complete)).toEqual({username:'Rachel',rankings:complete});});
 it.each([null,[],{}, {...complete,central:'S'}, {...complete,imaginary:'B'},Object.fromEntries(Object.entries(complete).slice(1)),{...complete,central:4}])('rejects incomplete or tampered rankings (%j)',value=>{expect(parseRankings(value)).toBeNull();});
 it.each(['','a','a'.repeat(41),'<script>alert(1)</script>','user\nname'])('rejects invalid names (%s)',name=>{expect(validateSubmission(name,complete)).toBeNull();});
 it.each(['Jo','Mary-Jane',"O’Connor",'Chloé','Commute_42'])('accepts names and nicknames (%s)',name=>{expect(validateSubmission(name,complete)?.username).toBe(name);});
 it.each(TIERS)('accepts all services ranked %s',tier=>{expect(parseRankings(Object.fromEntries(LINES.map(line=>[line.id,tier])))).not.toBeNull();});
});
describe('community average tier boundaries',()=>{
 it.each([[6,'A*'],[5.51,'A*'],[5.5,'A'],[5,'A'],[4,'B'],[3,'C'],[2,'D'],[1,'E'],[0,'F'],[0.5,'F'],[0.51,'E']])('maps score %s to tier %s',(score,tier)=>{expect(scoreToTier(Number(score))).toBe(tier);});
});
