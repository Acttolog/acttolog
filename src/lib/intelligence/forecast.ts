/**
 * Automated forecasting — pure and unit-tested (brief §14).
 *
 * Every output is explicitly labelled "AUTOMATED FORECAST — NOT MEASURED" and is
 * computed only from measured points. When there is too little measured data the
 * function returns null (the UI shows "Insufficient measured data"), never a
 * fabricated projection. Forecasts are stored separately from measured metrics.
 */

export const FORECAST_LABEL = 'AUTOMATED FORECAST — NOT MEASURED';

export type ForecastMethod = 'linear-trend' | 'moving-average';

export interface ForecastPoint {
  x: number;
  y: number;
  lower: number;
  upper: number;
}

export interface Forecast {
  method: ForecastMethod;
  label: typeof FORECAST_LABEL;
  horizon: number;
  basedOn: number; // count of measured points used
  points: ForecastPoint[];
}

const MIN_LINEAR_POINTS = 3;
const DEFAULT_WINDOW = 3;

const clamp0 = (n: number) => (n < 0 ? 0 : n);
const round = (n: number) => Math.round(n * 100) / 100;

export function leastSquares(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (ys[i] - meanY);
    den += (i - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: meanY - slope * meanX };
}

function stddev(ys: number[]): number {
  if (ys.length < 2) return 0;
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  const variance = ys.reduce((a, b) => a + (b - mean) ** 2, 0) / (ys.length - 1);
  return Math.sqrt(variance);
}

/**
 * Project `horizon` future points from a measured series (index 0..n-1).
 * Returns null when there is insufficient measured data for the chosen method.
 */
export function forecastSeries(
  ys: number[],
  horizon: number,
  method: ForecastMethod = 'linear-trend',
  window = DEFAULT_WINDOW,
): Forecast | null {
  const clean = ys.filter((v) => Number.isFinite(v));
  if (horizon < 1) return null;

  if (method === 'linear-trend') {
    if (clean.length < MIN_LINEAR_POINTS) return null;
    const { slope, intercept } = leastSquares(clean);
    const residuals = clean.map((y, i) => y - (intercept + slope * i));
    const band = stddev(residuals);
    const points: ForecastPoint[] = [];
    for (let h = 0; h < horizon; h++) {
      const x = clean.length + h;
      const y = clamp0(intercept + slope * x);
      points.push({ x, y: round(y), lower: round(clamp0(y - band)), upper: round(y + band) });
    }
    return { method, label: FORECAST_LABEL, horizon, basedOn: clean.length, points };
  }

  // moving-average
  if (clean.length < window) return null;
  const tail = clean.slice(-window);
  const mean = tail.reduce((a, b) => a + b, 0) / window;
  const band = stddev(tail);
  const points: ForecastPoint[] = [];
  for (let h = 0; h < horizon; h++) {
    const x = clean.length + h;
    const y = clamp0(mean);
    points.push({ x, y: round(y), lower: round(clamp0(y - band)), upper: round(y + band) });
  }
  return { method, label: FORECAST_LABEL, horizon, basedOn: clean.length, points };
}