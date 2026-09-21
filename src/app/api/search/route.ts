import { NextResponse } from 'next/server';
import { runSearch } from '@/lib/search';

export const dynamic = 'force-dynamic';

/** GET /api/search?q=…&locale=en — global search across all content kinds. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').slice(0, 200);
  const locale = url.searchParams.get('locale') === 'ne' ? 'ne' : 'en';
  const results = runSearch(q, locale);
  return NextResponse.json({ results });
}
