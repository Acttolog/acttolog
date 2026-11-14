/**
 * Statistical anomaly watch over a measured daily series (brief §12).
 *
 * Rolling-baseline z-score: each point is compared against the `window`
 * preceding measured points only, so a spike never inflates its own baseline.
 * Pure and unit-tested. Flags are statistical observations, never causal
 * findings — the UI must carry ANOMALY_LABEL and never imply proof.
 */

export const ANOMALY_LABEL = 'STATISTICAL ANOMALY — NOT A CAUSAL FINDING';
export const ANOMALY_WINDOW = 7;
export const MIN_ANOMALY_POINTS = ANOMALY_WINDOW + 1;

export interface AnomalyPoint {
  x: string;
  y: number;
  z: number;
  direction: 'spike' | 'drop';
}

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const stddev = (a: number[], m: number) => Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);

/**
 * Returns flagged points (|z| >= threshold) using a trailing measured baseline.
 * Returns [] when there is insufficient measured history — never invents an
 * anomaly from too little data. A zero-variance baseline uses a Poisson noise
 * floor so genuine departures from a flat series are still detected.
 */
export function detectAnomalies(
  series: [string, number][],
  threshold = 2,
  window = ANOMALY_WINDOW,
): AnomalyPoint[] {
  if (series.length < window + 1 || threshold <= 0) return [];
  const out: AnomalyPoint[] = [];
  for (let i = window; i < series.length; i++) {
    const base = series.slice(i - window, i).map(([, y]) => y);
    const m = mean(base);
    // Count data carries Poisson noise even when observed variance is zero;
    // floor the baseline stddev at sqrt(mean) so a flat baseline still detects
    // real departures instead of dividing by zero.
    const sd = Math.max(stddev(base, m), Math.sqrt(Math.max(m, 1)));
    const y = series[i][1];
    const z = (y - m) / sd;
    if (Math.abs(z) >= threshold) {
      out.push({ x: series[i][0], y, z: Math.round(z * 100) / 100, direction: z > 0 ? 'spike' : 'drop' });
    }
  }
  return out;
}