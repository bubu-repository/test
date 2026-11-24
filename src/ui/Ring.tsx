/** STUB: flat single-colour ring gauge. Replaced by the runs builder. */
export function Ring({ value, max, size = 48 }: { value: number; max: number; size?: number; stroke?: number; tone?: 'light' | 'dark'; label?: string; children?: React.ReactNode }) {
  return <svg width={size} height={size} aria-hidden="true"><circle cx={size / 2} cy={size / 2} r={size / 2 - 3} fill="none" stroke="currentColor" strokeDasharray={`${(value / max) * 100} 100`} pathLength={100} /></svg>;
}
