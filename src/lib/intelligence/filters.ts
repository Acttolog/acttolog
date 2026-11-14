/**
 * Global intelligence filters — pure URL <-> state codec (brief §10, §16).
 *
 * Filters live in the URL so they are shareable, bookmarkable and survive
 * refresh. Defaults are omitted from the query string to keep URLs clean.
 * Framework-free and unit-tested; the shell binds these to the router and the
 * API reads the same keys. Only `period` is honored server-side today; the other
 * dimensions are carried in the URL and applied client-side until their API
 * filters land (no claim of server-side div/region/device filtering yet).
 */

export type Period = 'live' | 'today' | '7' | '28' | '90';

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'today', label: 'Today' },
  { id: '7', label: '7 Days' },
  { id: '28', label: '28 Days' },
  { id: '90', label: '90 Days' },
];

const PERIOD_IDS = new Set<string>(PERIODS.map((p) => p.id));

export interface GlobalFilters {
  period: Period;
  div: string | null;
  region: string | null;
  device: string | null;
  q: string;
}

export const DEFAULT_FILTERS: GlobalFilters = {
  period: '28',
  div: null,
  region: null,
  device: null,
  q: '',
};

const MAX_DIM = 80;
const MAX_Q = 200;

function cleanDim(v: string | null): string | null {
  if (!v) return null;
  const t = v.trim().slice(0, MAX_DIM);
  return t.length ? t : null;
}

export function parseFilters(params: URLSearchParams): GlobalFilters {
  const p = params.get('period');
  return {
    period: p && PERIOD_IDS.has(p) ? (p as Period) : DEFAULT_FILTERS.period,
    div: cleanDim(params.get('div')),
    region: cleanDim(params.get('region')),
    device: cleanDim(params.get('device')),
    q: (params.get('q') || '').trim().slice(0, MAX_Q),
  };
}

/** Serialize to URLSearchParams, omitting any field equal to its default. */
export function filtersToParams(f: GlobalFilters): URLSearchParams {
  const out = new URLSearchParams();
  if (f.period !== DEFAULT_FILTERS.period) out.set('period', f.period);
  if (f.div) out.set('div', f.div);
  if (f.region) out.set('region', f.region);
  if (f.device) out.set('device', f.device);
  if (f.q) out.set('q', f.q);
  return out;
}

export function filtersToQuery(f: GlobalFilters): string {
  const s = filtersToParams(f).toString();
  return s ? `?${s}` : '';
}

/** True when no non-default filter is active (used to show/hide a "clear" affordance). */
export function isDefaultFilters(f: GlobalFilters): boolean {
  return filtersToParams(f).size === 0;
}