import type { Locale } from '@/lib/content/types';
import { runSearch, type SearchEntry } from '@/lib/search';

/**
 * Search with graceful degradation: uses the server API when deployed
 * (SSR/Vercel); falls back to the identical in-bundle index for static
 * hosts (GitHub Pages preview) so search never breaks.
 */
export async function searchAnywhere(q: string, locale: Locale): Promise<{ results: SearchEntry[]; local: boolean }> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&locale=${locale}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) return { results: data.results, local: false };
    }
  } catch { /* static host — fall through */ }
  return { results: runSearch(q, locale), local: true };
}
