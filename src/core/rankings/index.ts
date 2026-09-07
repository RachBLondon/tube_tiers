export const TIERS = ['A*', 'A', 'B', 'C', 'D', 'E', 'F'] as const;
export type Tier = (typeof TIERS)[number];
export const LINES = [
  { id: 'bakerloo', name: 'Bakerloo', color: '#a65a2a' },
  { id: 'central', name: 'Central', color: '#e52b32' },
  { id: 'circle', name: 'Circle', color: '#e6b900' },
  { id: 'district', name: 'District', color: '#008344' },
  { id: 'elizabeth', name: 'Elizabeth line', color: '#7750b9' },
  { id: 'hammersmith-city', name: 'Hammersmith & City', color: '#d783a0' },
  { id: 'jubilee', name: 'Jubilee', color: '#777f87' },
  { id: 'metropolitan', name: 'Metropolitan', color: '#9b0058' },
  { id: 'northern', name: 'Northern', color: '#252a32' },
  { id: 'piccadilly', name: 'Piccadilly', color: '#1647ad' },
  { id: 'victoria', name: 'Victoria', color: '#009fce' },
  { id: 'waterloo-city', name: 'Waterloo & City', color: '#57bfa6' },
  { id: 'overground', name: 'Overground', color: '#ec7525' },
  { id: 'dlr', name: 'DLR', color: '#00a6a5' },
  { id: 'trams', name: 'Trams', color: '#70ac22' },
  { id: 'thameslink', name: 'Thameslink', color: '#b62780' },
  { id: 'cable-car', name: 'Cable car', color: '#8656ac' },
  { id: 'uber-boat', name: 'Uber Boat', color: '#263d68' },
  { id: 'heathrow-express', name: 'Heathrow Express', color: '#59336e' },
];
export type Line = (typeof LINES)[number];
export type Rankings = Record<string, Tier>;
export type Submission = { id: string; username: string; rankings: Rankings; created_at: string };
export type Average = { line_id: string; average_score: number; votes: number };
export function isTier(value: unknown): value is Tier { return TIERS.some(tier => tier === value); }
export function parseRankings(value: unknown): Rankings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length !== LINES.length || entries.some(([id, tier]) => !LINES.some(line => line.id === id) || !isTier(tier))) return null;
  return Object.fromEntries(entries) as Rankings;
}
export function validateSubmission(username: unknown, rankings: unknown): { username: string; rankings: Rankings } | null {
  if (typeof username !== 'string') return null;
  const name = username.trim();
  const parsed = parseRankings(rankings);
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'’-]{1,39}$/u.test(name) || !parsed) return null;
  return { username: name, rankings: parsed };
}
export function scoreToTier(score: number): Tier {
  return TIERS[Math.max(0, Math.min(6, Math.round(6 - score)))] ?? 'F';
}
