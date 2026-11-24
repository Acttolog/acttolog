import raw from './sources.json';
import type { NoticeScope } from './notice-utils';
import { isReachable, urlHost, type PortalReach, type SourcesMeta, type VerifiedSource } from './source-utils';

/**
 * ACTTOLOG verified sources — server-side accessors over the build-time
 * reachability ledger written by tools/research-sources.js.
 *
 * Honesty contract: every measured field (status, httpStatus, ms, checkedAt,
 * title) comes from a real HTTPS GET performed when the site was compiled.
 * `meta.note` states plainly that this is an automated reachability check of
 * official portals — not a live government vacancy feed — and that users must
 * verify on the official site before applying. `lastVerifiedOn` only advances
 * when a fetch actually succeeded. Status/freshness shown to readers is
 * computed from these recorded timestamps, never invented.
 */

interface SourcesFile {
  meta: SourcesMeta;
  sources: VerifiedSource[];
}

const data = raw as unknown as SourcesFile;

export * from './source-utils';

export const sourceMeta = (): SourcesMeta => data.meta;
export const allSources = (): VerifiedSource[] => data.sources;
export const sourcesFor = (scope: NoticeScope): VerifiedSource[] =>
  data.sources.filter((s) => s.scope === scope);

/** Portals that answered the build-time check (2xx/3xx), including redirects. */
export const reachableSources = (): VerifiedSource[] => data.sources.filter(isReachable);

/**
 * Measured reachability keyed by host, so a notice board linking a portal shows
 * what the check actually found instead of implying the link was verified.
 */
export const reachByHost = (): Record<string, PortalReach> => {
  const out: Record<string, PortalReach> = {};
  for (const s of data.sources) {
    const h = urlHost(s.url) || s.host.toLowerCase();
    out[h] = { status: s.status, checkedAt: s.checkedAt };
  }
  return out;
};

export const sourceCounts = () => {
  const lk = sourcesFor('loksewa');
  return {
    total: data.sources.length,
    reachable: data.sources.filter(isReachable).length,
    unreachable: data.sources.filter((s) => s.status === 'unreachable').length,
    redirected: data.sources.filter((s) => s.status === 'redirected').length,
    loksewa: lk.length,
    government: lk.filter((s) => s.category === 'government').length,
    sansthan: lk.filter((s) => s.category === 'sansthan').length,
    bank: lk.filter((s) => s.category === 'bank').length,
  };
};