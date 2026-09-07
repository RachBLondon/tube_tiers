import type { CSSProperties } from 'react';
import type { Line } from '@/core/rankings';
export function LineChip({line, score}: {line: Line; score?: number}) {
  return <span className={`line-chip line-${line.id}`} style={{'--line-color':line.color} as CSSProperties} title={score===undefined?line.name:`${line.name}: ${score.toFixed(1)} out of 6`}>
    <span className="line-roundel" aria-hidden="true"/><span className="line-name">{line.name}</span>
  </span>;
}
